import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Bell, Smartphone } from 'lucide-react'

export const MobilePWAFeatures = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    }
  }

  const requestNotificationPermission = async () => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        console.log('Notification permission granted')
      }
    }
  }

  return (
    <div className="space-y-4">
      {showInstallPrompt && (
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Install App
            </CardTitle>
            <CardDescription>
              Install TicketSwap on your device for quick access and offline features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleInstallClick} className="w-full">
              Install Now
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Enable Notifications
          </CardTitle>
          <CardDescription>
            Get notified about new tickets and important updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={requestNotificationPermission} variant="outline" className="w-full">
            Enable Notifications
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Mobile Features
          </CardTitle>
          <CardDescription>
            Optimized for mobile with touch gestures and offline support
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>• Swipe gestures for navigation</li>
            <li>• Offline ticket viewing</li>
            <li>• Quick ticket search</li>
            <li>• Touch-optimized interface</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}