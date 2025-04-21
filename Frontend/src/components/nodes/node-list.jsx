"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { fetchNodes, sendHeartbeat, deleteNode } from "@/api/api"
import PropTypes from 'prop-types'
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"

export function NodeList({ refreshInterval = 10000 }) {
    const [nodes, setNodes] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadNodes()
        const interval = setInterval(loadNodes, refreshInterval)
        return () => clearInterval(interval)
    }, [refreshInterval])

    async function loadNodes() {
        try {
            const data = await fetchNodes()
            setNodes(data)
            setError(null)
        } catch (error) {
            const nodeError = {
                message: error instanceof Error ? error.message : 'An unknown error occurred',
                code: error instanceof Error ? error.name : 'UNKNOWN_ERROR'
            }
            setError(nodeError)
            toast.error("Failed to load nodes", {
                description: nodeError.message
            })
        } finally {
            setLoading(false)
        }
    }

    async function handleHeartbeat(nodeId) {
        try {
            await sendHeartbeat(nodeId)
            await loadNodes()
            toast.success("Heartbeat sent successfully", {
                description: "Node status updated"
            })
        } catch (error) {
            const nodeError = {
                message: error instanceof Error ? error.message : 'An unknown error occurred',
                code: error instanceof Error ? error.name : 'UNKNOWN_ERROR'
            }
            toast.error("Failed to send heartbeat", {
                description: nodeError.message
            })
        }
    }

    async function handleDeleteNode(nodeId) {
        try {
            await deleteNode(nodeId)
            toast.success("Node deleted successfully")
            await loadNodes()  // Reload the nodes list after deletion
        } catch (error) {
            const nodeError = {
                message: error instanceof Error ? error.message : 'An unknown error occurred',
                code: error instanceof Error ? error.name : 'UNKNOWN_ERROR'
            }
            toast.error("Failed to delete node", {
                description: nodeError.message
            })
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <p className="text-red-500 mb-4">{error.message}</p>
                    <Button onClick={loadNodes} variant="outline">
                        Retry
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nodes.map((node) => (
                <Card key={node.id} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-semibold">Node {node.id.substring(0, 8)}</h3>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                    node.status === 'healthy' ? 'bg-green-500' : 
                                    node.status === 'unhealthy' ? 'bg-yellow-500' : 'bg-red-500'
                                }`} />
                                <p className="text-sm capitalize">{node.status}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleHeartbeat(node.id)}
                                disabled={node.status === 'failed'}
                            >
                                Heartbeat
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm"
                                color="red"
                                onClick={() => handleDeleteNode(node.id)}
                            >
                                Delete Node
                            </Button>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>CPU Usage</span>
                                <span>{node.totalCpuCores - node.availableCpuCores}/{node.totalCpuCores} cores</span>
                            </div>
                            <Progress 
                                value={((node.totalCpuCores - node.availableCpuCores) / node.totalCpuCores) * 100} 
                            />
                        </div>
                        
                        <div className="flex justify-between text-sm">
                            <span>Pods</span>
                            <span>{node.pods.length}</span>
                        </div>
                        
                        {node.lastHeartbeat && (
                            <div className="text-sm text-gray-500">
                                Last heartbeat: {new Date(node.lastHeartbeat).toLocaleTimeString()}
                            </div>
                        )}
                    </div>
                </Card>
            ))}
        </div>
    )
}

NodeList.propTypes = {
    refreshInterval: PropTypes.number
}
