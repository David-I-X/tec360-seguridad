"use client"

import { useState } from "react"
import { FileUpload } from "@/components/file-upload"
import { ArrowLeft, Camera, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"

export default function ImagesPage() {
  const [files, setFiles] = useState<any[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleFilesChange = (newFiles: any[]) => {
    try {
      setFiles(newFiles)
      setError("")
    } catch (err) {
      setError("Error al procesar los archivos. Por favor, intenta de nuevo.")
    }
  }

  const handleSaveImages = async () => {
    if (files.length === 0) {
      setError("Por favor, selecciona al menos una imagen.")
      return
    }

    try {
      setIsUploading(true)
      setError("")
      setSuccess(false)

      // TODO: Integrar con backend y Supabase Storage
      // const formData = new FormData()
      // files.forEach((file, index) => {
      //   formData.append(`image_${index}`, file.file)
      //   formData.append(`type_${index}`, file.type) // 'before' or 'after'
      // })
      // 
      // const response = await fetch(
      //   `${process.env.NEXT_PUBLIC_API_URL}/services/{serviceId}/images`,
      //   {
      //     method: 'POST',
      //     body: formData,
      //   }
      // )

      // Simulación temporal de subida
      await new Promise(resolve => setTimeout(resolve, 2000))

      setSuccess(true)
      setFiles([])
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        window.location.href = "/servicios"
      }, 2000)
    } catch (err) {
      setError("Error al subir las imágenes. Por favor, verifica tu conexión e intenta de nuevo.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link href="/servicios">
            <Button variant="ghost" size="sm" disabled={isUploading}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al servicio
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Camera className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Subir Imágenes del Servicio</h1>
              <p className="text-muted-foreground">Agrega fotos antes y después del trabajo realizado</p>
            </div>
          </div>
        </div>

        <Card className="p-6 bg-card border-border mb-6">
          <div className="flex items-start gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
            <div className="text-blue-500 mt-1">ℹ️</div>
            <div>
              <p className="text-sm text-foreground font-medium mb-1">Tips para mejores fotos:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Usa buena iluminación</li>
                <li>Toma fotos desde diferentes ángulos</li>
                <li>Asegúrate que las imágenes sean claras y nítidas</li>
                <li>Marca si es foto "Antes" o "Después"</li>
              </ul>
            </div>
          </div>
        </Card>

        {error && (
          <Card className="mb-6 p-4 bg-destructive/10 border-destructive/20">
            <p className="text-destructive text-sm">{error}</p>
          </Card>
        )}

        {success && (
          <Card className="mb-6 p-4 bg-green-500/10 border-green-500/20">
            <p className="text-green-600 text-sm font-medium">
              ✓ Imágenes subidas exitosamente. Redirigiendo...
            </p>
          </Card>
        )}

        <FileUpload 
          maxFiles={8} 
          maxSizeMB={5} 
          onFilesChange={handleFilesChange} 
          showTypeSelector
          disabled={isUploading}
        />

        <div className="mt-8 flex justify-end">
          <Button 
            size="lg" 
            className="min-w-[200px] bg-blue-600 hover:bg-blue-700"
            onClick={handleSaveImages}
            disabled={isUploading || files.length === 0}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subiendo imágenes...
              </>
            ) : (
              `Guardar Imágenes (${files.length})`
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
