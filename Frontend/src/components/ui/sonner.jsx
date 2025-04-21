"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"
import PropTypes from 'prop-types'

const Toaster = ({ ...props }) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        }
      }
      {...props}
    />
  )
}

Toaster.propTypes = {
  // Add any specific props from sonner's ToasterProps if needed
}

export { Toaster } 