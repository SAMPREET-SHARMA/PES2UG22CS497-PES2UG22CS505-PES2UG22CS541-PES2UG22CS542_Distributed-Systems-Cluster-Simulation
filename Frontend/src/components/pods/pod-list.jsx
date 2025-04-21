"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { fetchPods, deletePod } from "@/api/api"
import PropTypes from 'prop-types'
import { toast } from "sonner"

export function PodList({ refreshInterval = 10000 }) {
    const [pods, setPods] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadPods()
        const interval = setInterval(loadPods, refreshInterval)
        return () => clearInterval(interval)
    }, [refreshInterval])

    async function loadPods() {
        try {
            const podList = await fetchPods()
            setPods(podList)
            setError(null)
        } catch (error) {
            const podError = {
                message: error instanceof Error ? error.message : 'An unknown error occurred',
                code: error instanceof Error ? error.name : 'UNKNOWN_ERROR'
            }
            setError(podError)
            toast.error("Failed to load pods", {
                description: podError.message
            })
        } finally {
            setLoading(false)
        }
    }

    async function handleDeletePod(podId) {
        try {
            await deletePod(podId)
            toast.success("Pod deleted successfully")
            await loadPods()  // Reload the pods list after deletion
        } catch (error) {
            const podError = {
                message: error instanceof Error ? error.message : 'An unknown error occurred',
                code: error instanceof Error ? error.name : 'UNKNOWN_ERROR'
            }
            toast.error("Failed to delete pod", {
                description: podError.message
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
                    <Button onClick={loadPods} variant="outline">
                        Retry
                    </Button>
                </div>
            </div>
        )
    }

    if (pods.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">No pods found</p>
                    <p className="text-sm text-gray-400">Create a node first to schedule pods</p>
                </div>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pods.map((pod) => (
                <Card key={pod.id} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-semibold">Pod {pod.id.substring(0, 8)}</h3>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                    pod.nodeStatus === 'healthy' ? 'bg-green-500' : 
                                    pod.nodeStatus === 'unhealthy' ? 'bg-yellow-500' : 'bg-red-500'
                                }`} />
                                <p className="text-sm capitalize">{pod.nodeStatus}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                size="sm"
                                color="red"
                                onClick={() => handleDeletePod(pod.id)}
                            >
                                Delete Pod
                            </Button>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                            <span>CPU Cores</span>
                            <span>{pod.cpuCores}</span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                            <span>Node</span>
                            <span className="font-mono">{pod.nodeId.substring(0, 8)}</span>
                        </div>
                        
                        {pod.createdAt && (
                            <div className="text-sm text-gray-500">
                                Created: {new Date(pod.createdAt).toLocaleString()}
                            </div>
                        )}
                    </div>
                </Card>
            ))}
        </div>
    )
}

PodList.propTypes = {
    refreshInterval: PropTypes.number
}
