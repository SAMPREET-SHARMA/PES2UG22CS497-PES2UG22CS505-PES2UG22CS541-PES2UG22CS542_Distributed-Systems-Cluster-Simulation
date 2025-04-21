const API_URL = 'http://localhost:3001';

// Using relative URLs to leverage Next.js rewrites
export async function fetchNodes() {
    const response = await fetch(`${API_URL}/nodes`);
    if (!response.ok) {
        throw new Error('Failed to fetch nodes');
    }
    return response.json();
}

export async function addNode(cpuCores) {
    const response = await fetch(`${API_URL}/nodes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cpuCores }),
    }); 
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add node');
    }
    
    return response.json();
}

export async function createPod(cpuCores) {
    const response = await fetch(`${API_URL}/pods`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cpuCores }),
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create pod');
    }
    
    return response.json();
}

export async function sendHeartbeat(nodeId) {
    const response = await fetch(`${API_URL}/heartbeat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nodeId }),
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send heartbeat');
    }
    
    return response.json();
}

export async function fetchPods() {
    const response = await fetch(`${API_URL}/pods`);
    if (!response.ok) {
        throw new Error('Failed to fetch pods');
    }
    return response.json();
} 

// Function to delete a node
export const deleteNode = async (nodeId) => {
    try {
        const response = await fetch(`${API_URL}/nodes/${nodeId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(`Failed to delete node: ${response.statusText}`);
        }

        return response.json();
    } catch (error) {
        throw new Error(error.message);
    }
};

// Function to delete a pod
export const deletePod = async (podId) => {
    try {
        const response = await fetch(`${API_URL}/pods/${podId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(`Failed to delete pod: ${response.statusText}`);
        }

        return response.json();
    } catch (error) {
        throw new Error(error.message);
    }
};
