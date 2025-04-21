import { Button } from "@/components/ui/button"
import Link from "next/link"
import PropTypes from 'prop-types'

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-100 p-4">
        <Link href="/" className="block">
          <h1 className="text-xl font-bold mb-4 hover:text-primary cursor-pointer">Dashboard</h1>
        </Link>
        <nav className="space-y-2">
          <Link href="/" className="block">
            <Button variant="ghost" className="w-full justify-start">
              Overview
            </Button>
          </Link>
          <Link href="/dashboard/nodes" className="block">
            <Button variant="ghost" className="w-full justify-start">
              Nodes
            </Button>
          </Link>
          <Link href="/dashboard/pods" className="block">
            <Button variant="ghost" className="w-full justify-start">
              Pods
            </Button>
          </Link>
        </nav>
      </div>
      
      {/* Main content */}
      <div className="flex-1 p-8">
        {children}
      </div>
    </div>
  )
}

DashboardLayout.propTypes = {
  children: PropTypes.node.isRequired
} 