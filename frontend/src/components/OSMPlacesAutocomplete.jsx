import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader, X } from 'lucide-react';

/**
 * Componente de autocomplete de endereços usando OpenStreetMap Nominatim (100% GRÁTIS)
 * 
 * Uso:
 * <OSMPlacesAutocomplete
 *   value={address}
 *   onChange={(address, lat, lng) => {
 *     setAddress(address);
 *     setLatitude(lat);
 *     setLongitude(lng);
 *   }}
 *   placeholder="Digite o endereço..."
 * />
 */
export function OSMPlacesAutocomplete({
  value = '',
  onChange,
  onAddressSelect,
  placeholder = 'Digite o endereço completo...',
  className = '',
  disabled = false,
  required = false
}) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimeout = useRef(null);
  const wrapperRef = useRef(null);

  // Atualizar input quando value mudar externamente
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Fechar suggestions ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAddress = async (query) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);

    try {
      // OpenStreetMap Nominatim API (GRÁTIS)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query)},Brasil` + // Adiciona Brasil para focar resultados
        `&format=json` +
        `&addressdetails=1` +
        `&limit=5` +
        `&countrycodes=br`, // Apenas resultados do Brasil
        {
          headers: {
            'Accept-Language': 'pt-BR,pt;q=0.9',
            // User-Agent é importante para OSM
            'User-Agent': 'SentinelZones/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar endereços');
      }

      const data = await response.json();
      
      // Formatar resultados
      const formattedSuggestions = data.map(item => ({
        display_name: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        address: item.address
      }));

      setSuggestions(formattedSuggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Erro ao buscar endereços:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Limpar coordenadas quando usuário digitar
    if (onChange) {
      onChange(newValue, null, null);
    }

    // Debounce - esperar 500ms após parar de digitar
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      searchAddress(newValue);
    }, 500);
  };

  const handleSelectSuggestion = (suggestion) => {
    setInputValue(suggestion.display_name);
    setShowSuggestions(false);
    setSuggestions([]);

    if (onChange) {
      onChange(
        suggestion.display_name,
        suggestion.latitude,
        suggestion.longitude
      );
    }

    if (onAddressSelect) {
      onAddressSelect({
        address: suggestion.display_name,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        addressDetails: suggestion.address
      });
    }
  };

  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    if (onChange) {
      onChange('', null, null);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {loading ? (
            <Loader size={20} className="text-slate-400 animate-spin" />
          ) : (
            <MapPin size={20} className="text-slate-400" />
          )}
        </div>
        
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            w-full pl-10 pr-10 py-2 bg-slate-800 border border-slate-600 rounded-lg
            text-slate-200 placeholder-slate-500
            focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500
            disabled:bg-slate-900/50 disabled:cursor-not-allowed
            transition-colors
            ${className}
          `}
        />

        {inputValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg shadow-black/50 max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full px-3 py-2 text-left hover:bg-cyan-500/10 border-b border-slate-700 last:border-0 transition-colors"
            >
              <div className="flex items-start gap-2">
                <MapPin size={16} className="text-cyan-400 mt-1 flex-shrink-0" />
                <span className="text-sm text-slate-300">{suggestion.display_name}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Info sobre OpenStreetMap */}
      <p className="text-xs text-slate-500 mt-1">
      </p>
    </div>
  );
}

/**
 * Componente de exibição de coordenadas
 */
export function CoordinatesDisplay({ latitude, longitude, className = '' }) {
  if (!latitude || !longitude) return null;

  return (
    <div className={`flex items-center gap-4 text-sm text-slate-400 ${className}`}>
      <div className="flex items-center gap-1">
        <span className="font-medium">Lat:</span>
        <span className="font-mono">{latitude.toFixed(6)}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="font-medium">Lng:</span>
        <span className="font-mono">{longitude.toFixed(6)}</span>
      </div>
      <a
        href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=16`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 transition-colors"
      >
        <MapPin size={14} />
        Ver no mapa
      </a>
    </div>
  );
}

/**
 * Hook para geocodificar endereços programaticamente
 */
export function useOSMGeocoding() {
  const [loading, setLoading] = useState(false);

  const geocodeAddress = async (address) => {
    setLoading(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(address)},Brasil` +
        `&format=json` +
        `&addressdetails=1` +
        `&limit=1` +
        `&countrycodes=br`,
        {
          headers: {
            'Accept-Language': 'pt-BR,pt;q=0.9',
            'User-Agent': 'SentinelZones/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao geocodificar endereço');
      }

      const data = await response.json();

      if (data.length === 0) {
        throw new Error('Endereço não encontrado');
      }

      const result = data[0];

      return {
        address: result.display_name,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        addressDetails: result.address
      };
    } catch (error) {
      console.error('Erro no geocoding:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    geocodeAddress,
    loading
  };
}
