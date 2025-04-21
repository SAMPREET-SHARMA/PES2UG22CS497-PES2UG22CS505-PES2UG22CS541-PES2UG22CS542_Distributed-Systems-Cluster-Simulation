import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { fetchNodes } from "@/api/api"

export default async function HomePage() {
    let nodes = [];
    let systemStatus = {
        status: 'operational'
    };
    
    try {
        nodes = await fetchNodes();
        if (nodes.length === 0) {
            systemStatus = { status: 'down', message: 'No nodes available' };
        } else if (nodes.filter(n => n.status === 'healthy').length < nodes.length / 2) {
            systemStatus = { status: 'degraded', message: 'Multiple nodes unhealthy' };
        }
    } catch (error) {
        systemStatus = { status: 'down', message: error instanceof Error ? error.message : 'Failed to fetch nodes' };
        nodes = [];
    }
    
    const stats = {
        totalNodes: nodes.length,
        activeNodes: nodes.filter(n => n.status === 'healthy').length,
        totalPods: nodes.reduce((acc, n) => acc + n.pods.length, 0),
        healthPercentage: nodes.length ? (nodes.filter(n => n.status === 'healthy').length / nodes.length) * 100 : 0
    }

    return (
        <main className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold">Cluster Control</h1>
                <Link href="/dashboard/nodes" className="inline-block">
                    <Button>Manage Nodes</Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-2">Total Nodes</h2>
                    <p className="text-3xl font-bold">{stats.totalNodes}</p>
                </Card>
                
                <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-2">Active Nodes</h2>
                    <p className="text-3xl font-bold text-green-600">{stats.activeNodes}</p>
                </Card>
                
                <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-2">Total Pods</h2>
                    <p className="text-3xl font-bold">{stats.totalPods}</p>
                </Card>
                
                <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-2">Cluster Health</h2>
                    <p className="text-3xl font-bold text-blue-600">{stats.healthPercentage.toFixed(1)}%</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                    <div className="space-y-3">
                        <Link href="/dashboard/nodes" className="block">
                            <Button className="w-full" variant="outline">View All Nodes</Button>
                        </Link>
                        <Link href="/dashboard" className="block">
                            <Button className="w-full" variant="outline">Dashboard</Button>
                        </Link>
                    </div>
                </Card>
                
                <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">System Status</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span>Cluster Status</span>
                            <span className="text-green-600">Operational</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Active Nodes</span>
                            <span>{stats.activeNodes} / {stats.totalNodes}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Running Pods</span>
                            <span>{stats.totalPods}</span>
                        </div>
                    </div>
                </Card>
            </div>
        </main>
    )
} 