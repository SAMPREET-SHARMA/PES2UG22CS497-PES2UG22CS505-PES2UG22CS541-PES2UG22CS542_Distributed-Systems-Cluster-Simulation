import { v4 as uuidv4 } from 'uuid';

class Node {
    constructor(cpuCores) {
        this.id = uuidv4();
        this.totalCpuCores = cpuCores;
        this.availableCpuCores = cpuCores;
        this.pods = [];
        this.lastHeartbeat = new Date();
        this.status = 'pending';
        this.containerId = null;
    }

    canHostPod(requiredCores) {
        return this.status === 'healthy' && this.availableCpuCores >= requiredCores;
    }

    addPod(podId, requiredCores) {
        this.pods.push(podId);
        this.availableCpuCores -= requiredCores;
    }

    removePod(podId, podCores) {
        const index = this.pods.indexOf(podId);
        if (index !== -1) {
            this.pods.splice(index, 1);
            this.availableCpuCores += podCores;
        }
    }

    toJSON() {
        return {
            id: this.id,
            totalCpuCores: this.totalCpuCores,
            availableCpuCores: this.availableCpuCores,
            pods: this.pods,
            status: this.status,
            containerId: this.containerId
        };
    }
}

export default Node;
