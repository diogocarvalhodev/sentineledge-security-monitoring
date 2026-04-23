from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
from typing import Optional, List

router = APIRouter(prefix="/geocoding", tags=["geocoding"])

class GeocodeRequest(BaseModel):
    address: str

class GeocodeResponse(BaseModel):
    latitude: float
    longitude: float
    display_name: str
    success: bool

class AddressSuggestion(BaseModel):
    display_name: str
    latitude: float
    longitude: float

@router.get("/autocomplete", response_model=List[AddressSuggestion])
def autocomplete_address(q: str, limit: int = 5):
    """
    Busca sugestões de endereço em tempo real (autocomplete)
    """
    try:
        if not q or len(q) < 3:
            return []
        
        url = "https://nominatim.openstreetmap.org/search"
        
        params = {
            "q": q,
            "format": "json",
            "limit": limit,
            "countrycodes": "br",  # Apenas Brasil
            "addressdetails": 1
        }
        
        headers = {
            "User-Agent": "SmartSecuritySystem/1.0"
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        suggestions = []
        for item in data:
            suggestions.append(AddressSuggestion(
                display_name=item["display_name"],
                latitude=float(item["lat"]),
                longitude=float(item["lon"])
            ))
        
        return suggestions
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar sugestões: {str(e)}"
        )

@router.post("/search", response_model=GeocodeResponse)
def geocode_address(request: GeocodeRequest):
    """
    Converte um endereço em coordenadas geográficas usando OpenStreetMap Nominatim
    """
    try:
        # API Nominatim do OpenStreetMap (gratuita)
        url = "https://nominatim.openstreetmap.org/search"
        
        params = {
            "q": request.address,
            "format": "json",
            "limit": 1,
            "countrycodes": "br"  # Apenas Brasil
        }
        
        headers = {
            "User-Agent": "SmartSecuritySystem/1.0"
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if not data or len(data) == 0:
            raise HTTPException(
                status_code=404,
                detail="Endereço não encontrado. Tente ser mais específico."
            )
        
        result = data[0]
        
        return GeocodeResponse(
            latitude=float(result["lat"]),
            longitude=float(result["lon"]),
            display_name=result["display_name"],
            success=True
        )
    
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar coordenadas: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro inesperado: {str(e)}"
        )

@router.get("/reverse")
def reverse_geocode(latitude: float, longitude: float):
    """
    Converte coordenadas em endereço (reverso)
    """
    try:
        url = "https://nominatim.openstreetmap.org/reverse"
        
        params = {
            "lat": latitude,
            "lon": longitude,
            "format": "json"
        }
        
        headers = {
            "User-Agent": "SmartSecuritySystem/1.0"
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        return {
            "address": data.get("display_name", ""),
            "success": True
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar endereço: {str(e)}"
        )
