class PodScheduler {
    constructor(nodeManager) {
        this.nodeManager = nodeManager;
    }

    firstFitSchedule(pod) {
        const nodes = this.nodeManager.listNodes();

        // No nodes in the cluster
        if (nodes.length === 0) {
            pod.status = 'pending';
            pod.nodeId = null;
            this.nodeManager.addPod(pod.id, pod);
            console.warn(`No nodes available. Pod ${pod.id} is pending.`);
            return null;
        }

        // Try scheduling on a suitable node
        for (const node of nodes) {
            if (node.status === 'healthy' && node.availableCpuCores >= pod.requiredCpuCores) {
                const nodeObj = this.nodeManager.getNode(node.id);
                nodeObj.addPod(pod.id, pod.requiredCpuCores);

                pod.assignToNode(node.id);
                pod.status = 'running';
                this.nodeManager.addPod(pod.id, pod);

                console.log(`Pod ${pod.id} scheduled on node ${node.id}`);
                return node.id;
            }
        }

        // No suitable node found
        pod.status = 'pending';
        pod.nodeId = null;
        this.nodeManager.addPod(pod.id, pod);
        console.warn(`No suitable node found for pod ${pod.id}. Marked as pending.`);
        return null;
    }

    removePod(podId) {
        this.nodeManager.removePod(podId);
    }
}

export default PodScheduler;
