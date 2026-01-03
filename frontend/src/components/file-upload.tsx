"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Upload, X, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface UploadedFile {
  id: string
  file: File
  preview: string
  type: "before" | "after" | "general"
}

interface FileUploadProps {
  maxFiles?: number
  maxSizeMB?: number
  onFilesChange?: (files: UploadedFile[]) => void
  showTypeSelector?: boolean
}

export function FileUpload({ maxFiles = 4, maxSizeMB = 5, onFilesChange, showTypeSelector = false }: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = useCallback(
    (newFiles: File[]) => {
      setError(null)
      setIsUploading(true)

      const validFiles = newFiles.filter((file) => {
        if (!file.type.startsWith("image/")) {
          setError("Solo se permiten imágenes")
          return false
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
          setError(`Las imágenes deben ser menores a ${maxSizeMB}MB`)
          return false
        }
        return true
      })

      if (files.length + validFiles.length > maxFiles) {
        setError(`Máximo ${maxFiles} imágenes permitidas`)
        setIsUploading(false)
        return
      }

      const uploadedFiles: UploadedFile[] = validFiles.map((file) => ({
        id: Math.random().toString(36).substring(7),
        file,
        preview: URL.createObjectURL(file),
        type: "general",
      }))

      const updatedFiles = [...files, ...uploadedFiles]
      setFiles(updatedFiles)
      onFilesChange?.(updatedFiles)
      setIsUploading(false)
    },
    [files, maxFiles, maxSizeMB, onFilesChange],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const droppedFiles = Array.from(e.dataTransfer.files)
      handleFileChange(droppedFiles)
    },
    [handleFileChange],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const removeFile = (id: string) => {
    const updatedFiles = files.filter((f) => f.id !== id)
    setFiles(updatedFiles)
    onFilesChange?.(updatedFiles)
    setError(null)
  }

  const updateFileType = (id: string, type: "before" | "after" | "general") => {
    const updatedFiles = files.map((f) => (f.id === id ? { ...f, type } : f))
    setFiles(updatedFiles)
    onFilesChange?.(updatedFiles)
  }

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {files.length < maxFiles && (
        <Card
          className={`relative overflow-hidden transition-all ${
            isDragging ? "border-blue-500 bg-blue-500/10" : "border-dashed border-border bg-card"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <label className="flex flex-col items-center justify-center p-8 cursor-pointer">
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  handleFileChange(Array.from(e.target.files))
                }
              }}
              disabled={isUploading}
            />

            {isUploading ? (
              <Loader2 className="h-12 w-12 text-muted-foreground animate-spin mb-4" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                <Upload className="h-6 w-6 text-blue-500" />
              </div>
            )}

            <h3 className="text-sm font-semibold text-foreground mb-1">
              {isDragging ? "Suelta las imágenes aquí" : "Subir imágenes"}
            </h3>
            <p className="text-xs text-muted-foreground text-center mb-2">
              Arrastra y suelta o haz clic para seleccionar
            </p>
            <p className="text-xs text-muted-foreground">
              Máximo {maxFiles} imágenes, {maxSizeMB}MB cada una
            </p>
          </label>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Preview Grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {files.map((file) => (
            <Card key={file.id} className="relative overflow-hidden group bg-card">
              <div className="aspect-square relative">
                <img
                  src={file.preview || "/placeholder.svg"}
                  alt={file.file.name}
                  className="w-full h-full object-cover"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button size="icon" variant="destructive" onClick={() => removeFile(file.id)} className="h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Type Badge */}
                {showTypeSelector && (
                  <div className="absolute top-2 left-2">
                    <select
                      value={file.type}
                      onChange={(e) => updateFileType(file.id, e.target.value as any)}
                      className="text-xs px-2 py-1 rounded bg-background/90 backdrop-blur-sm border border-border text-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="general">General</option>
                      <option value="before">Antes</option>
                      <option value="after">Después</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="p-2">
                <p className="text-xs text-muted-foreground truncate">{file.file.name}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
