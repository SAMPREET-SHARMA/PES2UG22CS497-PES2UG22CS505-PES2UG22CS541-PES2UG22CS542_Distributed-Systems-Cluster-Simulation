"use client"

import { PodList } from "@/components/pods/pod-list"
import { Button } from "@/components/ui/button"
import { createPod } from "@/api/api"
import { toast } from "sonner"

export default function PodsPage() {
  const handleCreatePod = async () => {
    try {
      // Default to 1 CPU core for simplicity
      await createPod(1);
      toast.success("Pod created successfully");
    } catch (error) {
      toast.error("Failed to create pod", {
        description: error.message
      });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pods</h1>
        <Button onClick={handleCreatePod}>Create Pod</Button>
      </div>
      
      <PodList />
    </div>
  )
} 