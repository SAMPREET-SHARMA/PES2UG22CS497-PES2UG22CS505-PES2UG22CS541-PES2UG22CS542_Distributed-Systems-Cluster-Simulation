"use client"

import { NodeList } from "@/components/nodes/node-list"
import { Button } from "@/components/ui/button"
import { addNode } from "@/api/api"
import { toast } from "sonner"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export default function NodesPage() {
  const [cpuCores, setCpuCores] = useState(1)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Define the handleCreateNode function
  const handleCreateNode = async () => {
    try {
      await addNode(Number(cpuCores))  // Assuming addNode sends the CPU cores count to the backend
      toast.success("Node created successfully")
      setIsDialogOpen(false)  // Close the dialog on successful creation
      setCpuCores(1)  // Reset the CPU cores input field
    } catch (error) {
      toast.error("Failed to create node", {
        description: error.message
      })
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Nodes</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add Node</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Node</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="cpuCores" className="text-sm font-medium">
                  CPU Cores
                </label>
                <Input
                  id="cpuCores"
                  type="number"
                  min="1"
                  value={cpuCores}
                  onChange={(e) => setCpuCores(e.target.value)}
                  placeholder="Enter number of CPU cores"
                />
              </div>
              <Button className="w-full" onClick={handleCreateNode}>
                Create Node
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <NodeList />
    </div>
  )
}
