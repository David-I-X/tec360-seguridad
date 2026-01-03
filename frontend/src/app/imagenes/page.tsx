"use client"
import { FileUpload } from "@/components/file-upload"
import { ArrowLeft, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"

export default function ImagesPage() {
  const handleFilesChange = (files: any[]) => {
    console.log("Files changed:", files)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link href="/servicios">
            <Button variant="ghost" size="sm">
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

        <FileUpload maxFiles={8} maxSizeMB={5} onFilesChange={handleFilesChange} showTypeSelector />

        <div className="mt-8 flex justify-end">
          <Button size="lg" className="min-w-[200px]">
            Guardar Imágenes
          </Button>
        </div>
      </div>
    </div>
  )
}
