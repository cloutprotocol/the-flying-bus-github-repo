
import * as React from "react"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { NavItem } from "@/components/Layout/menuItems"

interface MobileMenuButtonProps {
  isOpen: boolean
  onClick: () => void
}

export const MobileMenuButton: React.FC<MobileMenuButtonProps> = ({ 
  isOpen, 
  onClick 
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "md:hidden p-2 rounded-md text-gray-700 transition-all duration-200 ease-in-out",
        "hover:bg-gray-100/50 hover:scale-105 active:scale-95", // Subtle scale animation
        "focus:outline-none focus:ring-2 focus:ring-gray-200"
      )}
      aria-label={isOpen ? "Close menu" : "Open menu"}
    >
      {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
    </button>
  )
}

// Adding the missing MobileMenu component
interface MobileMenuProps {
  isOpen: boolean
  items?: NavItem[]
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ 
  isOpen,
  items = []
}) => {
  if (!isOpen) return null
  
  return (
    <div 
      className="md:hidden fixed inset-0 z-30 bg-white border-t border-gray-200 overflow-y-auto"
      role="navigation"
      aria-label="Mobile navigation menu"
    >
      <div className="p-4">
        <nav>
          <ul className="space-y-4">
            {items.map((item, index) => (
              <li key={index} className="py-2">
                <a 
                  href={item.to} 
                  className="text-lg font-medium text-gray-900 hover:text-gray-700 transition-all hover:scale-105 active:scale-95"
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}
