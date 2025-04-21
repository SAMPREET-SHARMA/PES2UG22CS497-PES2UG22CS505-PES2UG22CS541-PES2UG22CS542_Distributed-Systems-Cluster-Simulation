import Docker from 'dockerode';

// Initialize Docker client
const docker = new Docker();

/**
 * Creates a Docker container to represent a node
 * @param {string} nodeId - The ID of the node
 * @returns {Promise<string>} - The container ID
 */
export async function createNodeContainer(nodeId) {
  try {
    // Check Docker connectivity first
    await docker.ping();

    // Check if alpine image exists, pull if not
    try {
      await docker.getImage('alpine').inspect();
    } catch (error) {
      console.log('Alpine image not found, pulling...');
      await new Promise((resolve, reject) => {
        docker.pull('alpine', (err, stream) => {
          if (err) return reject(err);
          
          docker.modem.followProgress(stream, (err, output) => {
            if (err) return reject(err);
            resolve(output);
          });
        });
      });
      console.log('Alpine image pulled successfully');
    }
    
    // Create and start the container
    const containerConfig = {
      Image: 'alpine',
      name: `node_${nodeId}`,
      Cmd: ['sleep', 'infinity'],
      HostConfig: {
        AutoRemove: true
      },
      Labels: {
        'cluster.node.id': nodeId
      }
    };

    console.log(`Creating container for node ${nodeId}...`);
    const container = await docker.createContainer(containerConfig);
    console.log(`Starting container for node ${nodeId}...`);
    await container.start();
    
    const info = await container.inspect();
    console.log(`Container created successfully. ID: ${info.Id}, Status: ${info.State.Status}`);
    
    return container.id;
  } catch (error) {
    console.error(`Error creating container for node ${nodeId}:`, error);
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Could not connect to Docker daemon. Make sure Docker is running.');
    }
    if (error.statusCode === 404) {
      throw new Error('Docker image not found. Try pulling the image manually.');
    }
    throw error;
  }
}

/**
 * Removes a Docker container for a node
 * @param {string} containerId - The ID of the container
 */
export async function removeNodeContainer(containerId) {
    try {
        const container = docker.getContainer(containerId);
        
        // First check if container exists and its status
        try {
            const info = await container.inspect();
            if (info.State.Status === 'removing' || info.State.Status === 'exited') {
                console.log(`Container ${containerId} is already being removed or has exited`);
                return;
            }
        } catch (error) {
            if (error.statusCode === 404) {
                console.log(`Container ${containerId} not found, might have been already removed`);
                return;
            }
            throw error;
        }

        // If container is running, stop it first
        try {
            await container.stop();
            console.log(`Stopped container ${containerId}`);
        } catch (error) {
            if (error.statusCode === 304) {
                console.log(`Container ${containerId} already stopped`);
            } else if (error.statusCode !== 404) {
                throw error;
            }
        }

        // Remove the container
        try {
            await container.remove();
            console.log(`Container ${containerId} removed successfully`);
        } catch (error) {
            if (error.statusCode === 409) {
                console.log(`Container ${containerId} removal already in progress`);
            } else if (error.statusCode === 404) {
                console.log(`Container ${containerId} not found, might have been already removed`);
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error(`Error removing container ${containerId}:`, error);
        throw error;
    }
}

/**
 * Checks the status of a node's container
 * @param {string} containerId - The ID of the container
 * @returns {Promise<string>} - The container status
 */
export async function getContainerStatus(containerId) {
  try {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();
    return info.State.Status;
  } catch (error) {
    console.error(`Error checking container status for ${containerId}:`, error);
    if (error.statusCode === 404) {
      return "not_found";
    }
    return "unreachable";
  }
}
