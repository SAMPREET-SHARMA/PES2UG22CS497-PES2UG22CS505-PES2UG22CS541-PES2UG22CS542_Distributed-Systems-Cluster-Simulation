import { v4 as uuidv4 } from 'uuid';

export default class Pod {
    constructor(requiredCpuCores) {
        this.id = uuidv4();
        this.requiredCpuCores = requiredCpuCores;
        this.nodeId = null;
        this.status = 'pending';
    }

    assignToNode(nodeId) {
        this.nodeId = nodeId;
        this.status = 'running';
    }

    toJSON() {
        return {
            id: this.id,
            requiredCpuCores: this.requiredCpuCores,
            nodeId: this.nodeId,
            status: this.status,
        };
    }
}
