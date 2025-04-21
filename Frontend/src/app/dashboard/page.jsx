import { Card } from "@/components/ui/card"
import { fetchNodes } from "@/api/api"

export default async function DashboardPage() {
    let nodes = [];
    
    try {
        nodes = await fetchNodes();
    } catch (error) {
        console.error('Failed to fetch nodes:', error);
        // You might want to handle the error differently
    }
    
    const stats = {
        totalNodes: nodes.length,
        activeNodes: nodes.filter(n => n.status === 'healthy').length,
        totalPods: nodes.reduce((acc, n) => acc + n.pods.length, 0)
    }
    
    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Cluster Overview</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                    <h2 className="font-semibold mb-2">Total Nodes</h2>
                    <p className="text-2xl">{stats.totalNodes}</p>
                </Card>
                
                <Card className="p-4">
                    <h2 className="font-semibold mb-2">Active Nodes</h2>
                    <p className="text-2xl">{stats.activeNodes}</p>
                </Card>
                
                <Card className="p-4">
                    <h2 className="font-semibold mb-2">Total Pods</h2>
                    <p className="text-2xl">{stats.totalPods}</p>
                </Card>
            </div>
        </div>
    )
} 