
import Node from '../models/Node.js';
import { createNodeContainer, removeNodeContainer, getContainerStatus } from '../utils/docker.js';

class NodeManager {
    constructor() {
        this.nodes = new Map();
        this.pods = new Map();
        this.availableResources = {
            totalCpu: 0,
            availableCpu: 0
        };
        this.HEARTBEAT_INTERVAL = 10000;
        this.FAILURE_THRESHOLD = 30000;
        this.isReschedulingInProgress = false;
        this.startHeartbeatMonitor();
        this.startPodRetryLoop();
    }

    startPodRetryLoop() {
        setInterval(async () => {
            if (this.isReschedulingInProgress) return;
            const hasPendingPods = Array.from(this.pods.values()).some(pod => pod.status === 'pending');
            if (hasPendingPods) {
                console.log('Retrying to schedule pending pods...');
                await this.reschedulePendingPods();
            }
        }, 10000); // Retry every 10 seconds
    }
    

    async addNode(cpuCores) {
        const node = new Node(cpuCores);
        try {
            const containerId = await createNodeContainer(node.id);
            node.containerId = containerId;
            node.status = 'running';
            this.nodes.set(node.id, node);
            this.availableResources.totalCpu += cpuCores;
            this.availableResources.availableCpu += cpuCores;

            console.log(`Node ${node.id} added successfully. Attempting to reschedule pending pods...`);
            await this.reschedulePendingPods();
            return node;
        } catch (error) {
            console.error('Failed to create node:', error);
            throw error;
        }
    }

    async removeNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return { message: 'Node already removed', nodeId };

        const podsToReschedule = [...node.pods];
        for (const podId of podsToReschedule) {
            const pod = this.pods.get(podId);
            if (!pod) continue;

            let rescheduled = false;
            for (const candidateNode of this.nodes.values()) {
                if (
                    candidateNode.id !== nodeId &&
                    candidateNode.status === 'healthy' &&
                    candidateNode.canHostPod(pod.requiredCpuCores)
                ) {
                    candidateNode.addPod(podId, pod.requiredCpuCores);
                    pod.nodeId = candidateNode.id;
                    pod.status = 'running';
                    rescheduled = true;
                    console.log(`Pod ${podId} rescheduled to node ${candidateNode.id}`);
                    break;
                }
            }

            if (!rescheduled) {
                pod.nodeId = null;
                pod.status = 'pending';
                console.warn(`Pod ${podId} could not be rescheduled. Marked as pending.`);
            }
        }

        this.availableResources.totalCpu -= node.totalCpuCores;
        this.availableResources.availableCpu -= node.availableCpuCores;
        this.nodes.delete(nodeId);
        console.log(`Node ${nodeId} removed successfully`);
        return { message: 'Node removed successfully', nodeId };
    }

    getNode(nodeId) {
        return this.nodes.get(nodeId);
    }

    listNodes() {
        return Array.from(this.nodes.values()).map(node => node.toJSON());
    }

    updateNodeHeartbeat(nodeId) {
        const node = this.nodes.get(nodeId);
        if (node) {
            node.lastHeartbeat = new Date();
            node.status = 'healthy';
        }
    }

    getNodeStatus(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return null;
        return {
            id: node.id,
            status: node.status,
            cpu: {
                total: node.totalCpuCores,
                available: node.availableCpuCores,
                used: node.totalCpuCores - node.availableCpuCores
            },
            pods: node.pods,
            lastHeartbeat: node.lastHeartbeat,
            containerId: node.containerId
        };
    }

    startHeartbeatMonitor() {
        setInterval(async () => {
            const now = new Date();
            for (const [nodeId, node] of this.nodes.entries()) {
                try {
                    if (node.containerId) {
                        const status = await getContainerStatus(node.containerId);
                        node.status = status === 'running' ? 'healthy' : 'unhealthy';
                        if (node.lastHeartbeat && 
                            (now - node.lastHeartbeat) > this.FAILURE_THRESHOLD) {
                            this.handleNodeFailure(nodeId);
                        }
                    }
                } catch (error) {
                    node.status = 'unreachable';
                    if (node.lastHeartbeat && 
                        (now - node.lastHeartbeat) > this.FAILURE_THRESHOLD) {
                        this.handleNodeFailure(nodeId);
                    }
                }
            }
        }, this.HEARTBEAT_INTERVAL);
    }

    handleNodeFailure(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node || node.status === 'failed') return;

        const podsToReschedule = [...node.pods];
        node.status = 'failed';
        this.availableResources.totalCpu -= node.totalCpuCores;
        this.availableResources.availableCpu -= node.availableCpuCores;

        console.log(`Node ${nodeId} marked as failed. Rescheduling ${podsToReschedule.length} pods.`);

        for (const podId of podsToReschedule) {
            const pod = this.pods.get(podId);
            if (!pod) continue;

            for (const [candidateNodeId, candidateNode] of this.nodes.entries()) {
                if (candidateNode.status === 'healthy' && candidateNode.canHostPod(pod.requiredCpuCores)) {
                    node.removePod(podId, pod.requiredCpuCores);
                    candidateNode.addPod(podId, pod.requiredCpuCores);
                    pod.nodeId = candidateNodeId;
                    pod.status = 'running';
                    console.log(`Pod ${podId} rescheduled to node ${candidateNodeId}`);
                    break;
                }
            }
        }
    }

    async reschedulePendingPods() {
        if (this.isReschedulingInProgress) return;
        this.isReschedulingInProgress = true;

        for (const [podId, pod] of this.pods.entries()) {
            if (pod.status !== 'pending') continue;

            let rescheduled = false;
            for (const node of this.nodes.values()) {
                if (node.status === 'healthy' && node.canHostPod(pod.requiredCpuCores)) {
                    node.addPod(podId, pod.requiredCpuCores);
                    pod.nodeId = node.id;
                    pod.status = 'running';
                    console.log(`Pending pod ${podId} assigned to node ${node.id}`);
                    rescheduled = true;
                    break;
                }
            }

            if (!rescheduled) {
                console.log(`Pod ${podId} is still pending, no node has enough CPU`);
            }
        }

        this.isReschedulingInProgress = false;
    }

    getClusterResources() {
        return {
            totalCpu: this.availableResources.totalCpu,
            availableCpu: this.availableResources.availableCpu,
            nodeCount: this.nodes.size
        };
    }

    getAllPods() {
        const allPods = [];
        for (const node of this.nodes.values()) {
            for (const podId of node.pods) {
                const pod = this.pods.get(podId);
                if (pod) {
                    allPods.push({
                        ...pod,
                        nodeId: node.id,
                        nodeStatus: node.status
                    });
                }
            }
        }
        return allPods;
    }

    addPod(podId, pod) {
        this.pods.set(podId, pod);
    }

    removePod(podId) {
        const pod = this.pods.get(podId);
        if (!pod) {
            console.log(`Pod ${podId} not found, already removed`);
            return;
        }

        if (pod.nodeId) {
            const node = this.nodes.get(pod.nodeId);
            if (node) {
                node.removePod(podId, pod.requiredCpuCores);
            }
        }

        this.pods.delete(podId);
        console.log(`Pod ${podId} removed successfully`);
    }

    getPod(podId) {
        return this.pods.get(podId);
    }
}

export default NodeManager;
