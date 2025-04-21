import express from 'express';
import bodyParser from 'body-parser';
import NodeManager  from './managers/NodeManager.js';
import PodScheduler from './managers/PodScheduler.js';
import HealthMonitor  from './managers/HealthMonitor.js';
import Pod  from './models/Pod.js';
import { removeNodeContainer } from './utils/docker.js';

const app = express();
app.use(bodyParser.json());

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

const nodeManager = new NodeManager();
const podScheduler = new PodScheduler(nodeManager);
const healthMonitor = new HealthMonitor(nodeManager);

setInterval(() => {
    healthMonitor.checkNodeHealth();
}, 60000);

// Node routes
app.post('/nodes', async (req, res) => {
    try {
        const { cpuCores } = req.body;
        
        // Add validation for cpuCores
        if (cpuCores === undefined || cpuCores === null) {
            return res.status(400).json({ 
                error: "Missing required field: cpuCores",
                suggestion: "Please provide a valid 'cpuCores' value in your request"
            });
        }
        
        if (typeof cpuCores !== 'number' || cpuCores <= 0) {
            return res.status(400).json({ 
                error: "Invalid cpuCores value",
                suggestion: "cpuCores must be a positive number"
            });
        }
        
        const node = await nodeManager.addNode(cpuCores);
        res.status(201).json(node.toJSON());
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/nodes', (req, res) => {
    res.json(nodeManager.listNodes());
});

// Pod routes
app.get('/pods', (req, res) => {
    try {
        const pods = nodeManager.getAllPods();
        res.json(pods);
    } catch (err) {
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
});

app.post('/pods', async (req, res) => {
    try {
        const { cpuCores } = req.body;
        
        if (!cpuCores || cpuCores <= 0) {
            return res.status(400).json({ error: "CPU cores must be a positive number" });
        }
        
        const pod = new Pod(cpuCores);
        
        try {
            const nodeId = podScheduler.firstFitSchedule(pod);
            nodeManager.addPod(pod.id, pod);
            res.status(201).json({
                pod: pod.toJSON(),
                nodeId
            });
        } catch (scheduleError) {
            return res.status(400).json({ 
                error: scheduleError.message,
                suggestion: "Try creating a node with sufficient CPU resources first" 
            });
        }
    } catch (err) {
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
});

app.post('/heartbeat', (req, res) => {
    const { nodeId } = req.body;
    
    // Add validation for nodeId
    if (!nodeId) {
        return res.status(400).json({ 
            error: "Missing required field: nodeId",
            suggestion: "Please provide a valid 'nodeId' value in your request"
        });
    }
    
    // Check if the node exists
    const node = nodeManager.getNode(nodeId);
    if (!node) {
        return res.status(404).json({ 
            error: "Node not found",
            suggestion: "The specified nodeId does not exist"
        });
    }
    
    nodeManager.updateNodeHeartbeat(nodeId);
    res.json({ status: 'success' });
});

// Delete a node
app.delete('/nodes/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const node = nodeManager.getNode(id);
        if (!node) {
            return res.status(200).json({ message: `Node ${id} already removed` });
        }
        
        // First remove the Docker container
        if (node.containerId) {
            try {
                await removeNodeContainer(node.containerId);
            } catch (error) {
                // Handle different error cases
                if (error.statusCode === 304) {
                    // Container already stopped
                    console.log(`Container ${node.containerId} already stopped`);
                } else if (error.statusCode === 409) {
                    // Container removal already in progress
                    console.log(`Container ${node.containerId} removal already in progress`);
                } else if (error.statusCode === 404) {
                    // Container not found (already removed)
                    console.log(`Container ${node.containerId} not found, already removed`);
                } else {
                    console.error(`Error removing container for node ${id}:`, error);
                    return res.status(500).json({ error: 'Failed to remove container' });
                }
            }
        }
        
        // Then remove the node from NodeManager
        try {
            const result = await nodeManager.removeNode(id);
            res.status(200).json(result);
        } catch (error) {
            console.error(`Error removing node ${id}:`, error);
            res.status(500).json({ error: 'Failed to remove node' });
        }
    } catch (err) {
        console.error(`Error in delete node endpoint:`, err);
        res.status(500).json({ error: err.message });
    }
});

// Delete a pod
app.delete('/pods/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const pod = nodeManager.getPod(id);
        if (!pod) {
            return res.status(200).json({ message: `Pod ${id} already removed` });
        }

        // Remove pod from node and release CPU resources
        const node = nodeManager.getNode(pod.nodeId);
        if (node) {
            node.removePod(pod.id, pod.requiredCpuCores);
        }
        
        // Remove the pod from PodManager
        nodeManager.removePod(pod.id);

        res.status(200).json({ message: `Pod ${id} deleted successfully` });
    } catch (err) {
        console.error(`Error deleting pod ${id}:`, err);
        res.status(500).json({ error: `Failed to delete pod: ${err.message}` });
    }
});


const PORT = process.env.PORT || 3001;

function startServer(port) {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is busy, trying ${port + 1}`);
            startServer(port + 1);
        } else {
            console.error('Server error:', err);
        }
    });
}

startServer(PORT);
