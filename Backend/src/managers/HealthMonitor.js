import Pod from '../models/Pod.js';

class HealthMonitor {
    constructor(nodeManager, podManager) {
        this.nodeManager = nodeManager;
        this.podManager = podManager;
        this.failureThreshold = 30000; // 30 seconds
        this.monitorInterval = null;
    }

    startMonitoring() {
        // Start periodic health checks
        this.monitorInterval = setInterval(() => {
            this.checkNodeHealth();
        }, 10000); // Check every 10 seconds
        
        console.log('Health monitoring started');
    }

    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        console.log('Health monitoring stopped');
    }

    checkNodeHealth() {
        const currentTime = new Date();
        const nodes = this.nodeManager.listNodes();
        
        for (const node of nodes) {
            // Check if node has missed heartbeats
            if (node.lastHeartbeat) {
                const timeSinceLastHeartbeat = currentTime - new Date(node.lastHeartbeat);
                
                if (timeSinceLastHeartbeat > this.failureThreshold && node.status !== 'failed') {
                    console.log(`Node ${node.id} has missed heartbeats for ${timeSinceLastHeartbeat}ms. Marking as failed.`);
                    this.handleNodeFailure(node.id);
                }
            }
            
            // Also check nodes marked as unhealthy by NodeManager
            if (node.status === 'unhealthy' || node.status === 'unreachable') {
                console.log(`Node ${node.id} is in ${node.status} state. Checking for recovery or failure...`);
                this.handleNodeFailure(node.id);
            }
        }
    }

    handleNodeFailure(nodeId) {
        const node = this.nodeManager.getNode(nodeId);
        if (!node || node.status === 'failed') return;
        
        console.log(`Handling failure for node ${nodeId}`);
        
        // Get all pods on the failed node before marking it as failed
        const podsToReschedule = [...node.pods];
        
        // Mark node as failed through NodeManager
        this.nodeManager.handleNodeFailure(nodeId);
        
        // Reschedule all pods from the failed node
        this.reschedulePods(podsToReschedule);
    }

    reschedulePods(podIds) {
        console.log(`Attempting to reschedule ${podIds.length} pods`);
        
        for (const podId of podIds) {
            try {
                // Get the actual pod from PodManager
                const pod = this.podManager.getPod(podId);
                if (!pod) {
                    console.log(`Pod ${podId} not found in PodManager, skipping`);
                    continue;
                }
                
                // Find a healthy node with enough resources
                const nodes = this.nodeManager.listNodes();
                let targetNodeId = null;
                
                for (const node of nodes) {
                    if (node.status === 'healthy' && node.availableCpuCores >= pod.requiredCpuCores) {
                        targetNodeId = node.id;
                        break;
                    }
                }
                
                if (targetNodeId) {
                    // Update pod assignment
                    pod.nodeId = targetNodeId;
                    pod.status = 'running';
                    
                    // Update node resources
                    const targetNode = this.nodeManager.getNode(targetNodeId);
                    targetNode.addPod(podId, pod.requiredCpuCores);
                    
                    console.log(`Successfully rescheduled pod ${podId} to node ${targetNodeId}`);
                } else {
                    console.log(`No suitable node found for pod ${podId}. Pod will remain pending.`);
                    pod.status = 'pending';
                    pod.nodeId = null;
                }
            } catch (err) {
                console.error(`Failed to reschedule pod ${podId}: ${err.message}`);
            }
        }
    }
}

export default HealthMonitor;
