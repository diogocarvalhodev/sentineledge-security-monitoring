import React, { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';

export function ImageViewer({ src, alt, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleDownload = async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = alt || 'imagem.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50"
      onClick={onClose}
    >
      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-lg p-3 flex items-center gap-3 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
          className="p-2 hover:bg-gray-700 rounded text-white transition-colors"
          title="Diminuir zoom"
        >
          <ZoomOut size={20} />
        </button>
        
        <span className="text-white text-sm min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        
        <button
          onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
          className="p-2 hover:bg-gray-700 rounded text-white transition-colors"
          title="Aumentar zoom"
        >
          <ZoomIn size={20} />
        </button>
        
        <div className="w-px h-6 bg-gray-600"></div>
        
        <button
          onClick={(e) => { e.stopPropagation(); handleRotate(); }}
          className="p-2 hover:bg-gray-700 rounded text-white transition-colors"
          title="Rotacionar"
        >
          <RotateCw size={20} />
        </button>
        
        <button
          onClick={(e) => { e.stopPropagation(); handleReset(); }}
          className="p-2 hover:bg-gray-700 rounded text-white transition-colors"
          title="Resetar"
        >
          <Maximize2 size={20} />
        </button>
        
        <div className="w-px h-6 bg-gray-600"></div>
        
        <button
          onClick={(e) => { e.stopPropagation(); handleDownload(); }}
          className="p-2 hover:bg-gray-700 rounded text-white transition-colors"
          title="Baixar"
        >
          <Download size={20} />
        </button>
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-white transition-colors z-10"
        title="Fechar (ESC)"
      >
        <X size={24} />
      </button>

      {/* Image */}
      <div
        className="max-w-[90vw] max-h-[90vh] overflow-auto p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="transition-all duration-300 ease-out"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center center'
          }}
        />
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-gray-800 bg-opacity-75 px-4 py-2 rounded-lg">
        Pressione <kbd className="px-2 py-1 bg-gray-700 rounded mx-1">ESC</kbd> para fechar
      </div>
    </div>
  );
}

// Componente de thumbnail com preview
export function ImageThumbnail({ src, alt, className = '' }) {
  const [showViewer, setShowViewer] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <span className="text-gray-400 text-sm">Imagem não disponível</span>
      </div>
    );
  }

  return (
    <>
      <div className="relative group">
        <img
          src={src}
          alt={alt}
          className={`rounded-lg border border-gray-300 cursor-pointer transition-all hover:shadow-lg ${className}`}
          onClick={() => setShowViewer(true)}
          onError={() => setImageError(true)}
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-all flex items-center justify-center">
          <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={32} />
        </div>
      </div>

      {showViewer && (
        <ImageViewer
          src={src}
          alt={alt}
          onClose={() => setShowViewer(false)}
        />
      )}
    </>
  );
}

// Galeria de imagens
export function ImageGallery({ images }) {
  const [selectedIndex, setSelectedIndex] = useState(null);

  if (!images || images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <div
            key={index}
            className="relative group cursor-pointer"
            onClick={() => setSelectedIndex(index)}
          >
            <img
              src={image.src}
              alt={image.alt || `Imagem ${index + 1}`}
              className="w-full h-48 object-cover rounded-lg border border-gray-300 hover:shadow-lg transition-all"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2VtIGluZGlzcG9uw612ZWw8L3RleHQ+PC9zdmc+';
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded-lg transition-all flex items-center justify-center">
              <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={32} />
            </div>
            {image.timestamp && (
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                {new Date(image.timestamp).toLocaleString('pt-BR')}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedIndex !== null && (
        <ImageViewer
          src={images[selectedIndex].src}
          alt={images[selectedIndex].alt}
          onClose={() => setSelectedIndex(null)}
        />
      )}
    </>
  );
}
