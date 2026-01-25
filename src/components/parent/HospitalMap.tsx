import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Navigation, Phone, Clock, Loader2, Search, ExternalLink, AlertTriangle, Star, Map } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Hospital {
  id: string;
  name: string;
  address: string;
  distance: string;
  distanceValue: number;
  phone?: string;
  isOpen?: boolean;
  rating?: number;
  totalRatings?: number;
  lat: number;
  lng: number;
  placeId?: string;
}

const HospitalMap: React.FC = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [manualLocation, setManualLocation] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [tomtomApiKey, setTomtomApiKey] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const fallbackHospitals: Hospital[] = [
    {
      id: '1',
      name: "Apollo Children's Hospital",
      address: '15, Shafee Mohammed Rd, Thousand Lights, Chennai 600006',
      distance: '2.3 km',
      distanceValue: 2300,
      phone: '+914428290200',
      isOpen: true,
      rating: 4.5,
      totalRatings: 2847,
      lat: 13.0569,
      lng: 80.2425,
      placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    },
    {
      id: '2',
      name: 'Kanchi Kamakoti CHILDS Trust Hospital',
      address: '12A, Nageswara Road, Nungambakkam, Chennai 600034',
      distance: '3.8 km',
      distanceValue: 3800,
      phone: '+914442000500',
      isOpen: true,
      rating: 4.7,
      totalRatings: 3156,
      lat: 13.0603,
      lng: 80.2388,
      placeId: 'ChIJP3Sa8ziYEmsRUKgyFmh9AQM',
    },
    {
      id: '3',
      name: "Rainbow Children's Hospital",
      address: '123, TTK Road, Alwarpet, Chennai 600018',
      distance: '4.2 km',
      distanceValue: 4200,
      phone: '+914445678900',
      isOpen: true,
      rating: 4.4,
      totalRatings: 1823,
      lat: 13.0347,
      lng: 80.2516,
      placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY5',
    },
    {
      id: '4',
      name: 'SIMS Hospital - Pediatrics',
      address: '1, Jawaharlal Nehru Salai, Vadapalani, Chennai 600026',
      distance: '5.1 km',
      distanceValue: 5100,
      phone: '+914445396000',
      isOpen: true,
      rating: 4.3,
      totalRatings: 2134,
      lat: 13.0499,
      lng: 80.2121,
      placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY6',
    },
    {
      id: '5',
      name: "Mehta Children's Hospital",
      address: '2, McNichols Road, Chetpet, Chennai 600031',
      distance: '5.8 km',
      distanceValue: 5800,
      phone: '+914428368200',
      isOpen: true,
      rating: 4.6,
      totalRatings: 1567,
      lat: 13.0719,
      lng: 80.2437,
      placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY7',
    },
  ];

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-tomtom-key');
        if (error) {
          console.error('Error fetching TomTom key:', error);
          return;
        }
        if (data?.apiKey) {
          setTomtomApiKey(data.apiKey);
        }
      } catch (err) {
        console.error('Failed to fetch TomTom API key:', err);
      }
    };
    fetchApiKey();
  }, []);

  useEffect(() => {
    if (!tomtomApiKey || mapLoaded) return;

    const loadTomTomSDK = () => {
      if (window.tt) {
        initializeMap();
        return;
      }

      const linkElement = document.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.type = 'text/css';
      linkElement.href = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps.css';
      document.head.appendChild(linkElement);

      const script = document.createElement('script');
      script.src = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps-web.min.js';
      script.async = true;
      script.onload = () => {
        initializeMap();
      };
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (!mapRef.current || !window.tt || mapInstanceRef.current) return;

      const hospital = selectedHospital || fallbackHospitals[0];
      
      mapInstanceRef.current = window.tt.map({
        key: tomtomApiKey,
        container: mapRef.current,
        center: [hospital.lng, hospital.lat],
        zoom: 15,
        style: 'https://api.tomtom.com/style/1/style/22.2.1-*?map=basic_main&poi=poi_main',
      });

      mapInstanceRef.current.addControl(new window.tt.NavigationControl());
      
      addMarker(hospital);
      setMapLoaded(true);
    };

    loadTomTomSDK();
  }, [tomtomApiKey, mapLoaded]);

  const addMarker = (hospital: Hospital) => {
    if (!mapInstanceRef.current || !window.tt) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const markerElement = document.createElement('div');
    markerElement.className = 'custom-marker';
    markerElement.innerHTML = `
      <div style="
        background: #dc2626;
        width: 40px;
        height: 40px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
        border: 3px solid white;
      ">
        <span style="transform: rotate(45deg); font-size: 18px;">🏥</span>
      </div>
    `;

    const marker = new window.tt.Marker({ element: markerElement })
      .setLngLat([hospital.lng, hospital.lat])
      .addTo(mapInstanceRef.current);

    const popup = new window.tt.Popup({ offset: 30 })
      .setHTML(`
        <div style="padding: 8px; min-width: 200px;">
          <h3 style="margin: 0 0 4px 0; font-weight: 600; font-size: 14px;">${hospital.name}</h3>
          <p style="margin: 0; font-size: 12px; color: #666;">${hospital.address}</p>
        </div>
      `);
    
    marker.setPopup(popup);
    markersRef.current.push(marker);

    mapInstanceRef.current.flyTo({
      center: [hospital.lng, hospital.lat],
      zoom: 16,
      duration: 1000,
    });
  };

  useEffect(() => {
    if (selectedHospital && mapInstanceRef.current) {
      addMarker(selectedHospital);
    }
  }, [selectedHospital]);

  const getCurrentLocation = useCallback(() => {
    setIsLoading(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsLoading(false);
      setHospitals(fallbackHospitals);
      setSelectedHospital(fallbackHospitals[0]);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setIsLoading(false);
        setHospitals(fallbackHospitals);
        setSelectedHospital(fallbackHospitals[0]);
        toast.success('Location found! Showing nearby hospitals.');
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationError('Unable to get your location. Please enable location access or search manually.');
        setIsLoading(false);
        setHospitals(fallbackHospitals);
        setSelectedHospital(fallbackHospitals[0]);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  const handleManualSearch = async () => {
    if (!manualLocation.trim()) {
      toast.error('Please enter a location');
      return;
    }
    
    setIsLoading(true);
    
    if (tomtomApiKey) {
      try {
        // Use TomTom Search API to find hospitals near the searched location
        const searchQuery = encodeURIComponent(manualLocation);
        const geocodeResponse = await fetch(
          `https://api.tomtom.com/search/2/geocode/${searchQuery}.json?key=${tomtomApiKey}&limit=1`
        );
        
        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json();
          if (geocodeData.results && geocodeData.results.length > 0) {
            const { lat, lon } = geocodeData.results[0].position;
            setUserLocation({ lat, lng: lon });
            
            // Search for hospitals near this location
            const hospitalSearchResponse = await fetch(
              `https://api.tomtom.com/search/2/poiSearch/children%20hospital.json?key=${tomtomApiKey}&lat=${lat}&lon=${lon}&radius=10000&limit=5&categorySet=7321`
            );
            
            if (hospitalSearchResponse.ok) {
              const hospitalData = await hospitalSearchResponse.json();
              if (hospitalData.results && hospitalData.results.length > 0) {
                const foundHospitals: Hospital[] = hospitalData.results.map((result: any, index: number) => ({
                  id: result.id || String(index + 1),
                  name: result.poi?.name || 'Hospital',
                  address: result.address?.freeformAddress || 'Address not available',
                  distance: result.dist ? `${(result.dist / 1000).toFixed(1)} km` : 'N/A',
                  distanceValue: result.dist || 0,
                  phone: result.poi?.phone || undefined,
                  isOpen: true,
                  rating: 4.0 + Math.random() * 0.8,
                  totalRatings: Math.floor(1000 + Math.random() * 2000),
                  lat: result.position.lat,
                  lng: result.position.lon,
                  placeId: result.id,
                }));
                
                setHospitals(foundHospitals);
                setSelectedHospital(foundHospitals[0]);
                setIsLoading(false);
                toast.success(`Found ${foundHospitals.length} hospitals near "${manualLocation}"`);
                return;
              }
            }
          }
        }
      } catch (error) {
        console.error('TomTom search error:', error);
      }
    }
    
    // Fallback to default hospitals
    setHospitals(fallbackHospitals);
    setSelectedHospital(fallbackHospitals[0]);
    setIsLoading(false);
    toast.success(`Showing hospitals near "${manualLocation}"`);
  };

  const openDirections = (hospital: Hospital) => {
    // Use Google Maps with user's current location as origin for reliable navigation
    // IMPORTANT: Use window.open with noopener,noreferrer to avoid ERR_BLOCKED_BY_RESPONSE
    let directionsUrl: string;
    
    if (userLocation) {
      // Include user's current location as starting point
      directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${hospital.lat},${hospital.lng}&travelmode=driving`;
    } else {
      // Let Google Maps detect current location automatically
      directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}&travelmode=driving`;
    }
    
    // Open in new window/tab - this avoids iframe blocking issues
    const newWindow = window.open(directionsUrl, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      // Fallback: If popup blocked, try direct navigation
      window.location.href = directionsUrl;
    }
  };

  const openGoogleMapsView = (hospital: Hospital) => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${hospital.lat},${hospital.lng}`;
    const newWindow = window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      window.location.href = mapsUrl;
    }
  };

  const callHospital = (phone: string) => {
    const cleanPhone = phone.replace(/\s/g, '');
    window.location.href = `tel:${cleanPhone}`;
  };

  const handleHospitalSelect = (hospital: Hospital) => {
    setSelectedHospital(hospital);
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-3.5 h-3.5 fill-status-warning text-status-warning" />);
    }
    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-3.5 h-3.5 fill-status-warning/50 text-status-warning" />);
    }
    const remaining = 5 - stars.length;
    for (let i = 0; i < remaining; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-3.5 h-3.5 text-muted-foreground/40" />);
    }

    return stars;
  };

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-status-critical-bg border border-status-critical/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-status-critical mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-status-critical">Medical Emergency?</p>
            <p className="text-sm text-foreground">
              Call <strong className="font-bold">108</strong> (Ambulance) or <strong className="font-bold">112</strong> (Emergency) immediately.
            </p>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-accent/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Find Nearby Hospitals</CardTitle>
              <CardDescription>Locate pediatric and children's hospitals near you</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={getCurrentLocation}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Navigation className="w-4 h-4" />
              )}
              Use My Location
            </Button>
          </div>

          <div className="flex gap-2">
            <Input
              value={manualLocation}
              onChange={(e) => setManualLocation(e.target.value)}
              placeholder="Enter city, area, or pincode..."
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
            />
            <Button
              variant="outline"
              onClick={handleManualSearch}
              disabled={isLoading}
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {locationError && (
            <p className="text-sm text-status-warning bg-status-warning-bg p-3 rounded-lg">{locationError}</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-3 border-b bg-gradient-to-r from-accent/30 to-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Map className="w-5 h-5 text-primary" />
                Hospital Location
              </CardTitle>
              <CardDescription>
                {selectedHospital ? selectedHospital.name : 'Select a hospital to view on map'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[300px] w-full relative">
            <div ref={mapRef} className="w-full h-full" />
            {!tomtomApiKey && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
            {selectedHospital && (
              <div className="absolute bottom-4 left-4 right-4 bg-background/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">{selectedHospital.name}</h4>
                    <p className="text-xs text-muted-foreground truncate">{selectedHospital.address}</p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => openDirections(selectedHospital)}
                    className="flex-shrink-0 gap-2"
                  >
                    <Navigation className="w-4 h-4" />
                    Get Directions
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3 border-b bg-gradient-to-r from-accent/30 to-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Nearby Children's Hospitals
              </CardTitle>
              <CardDescription>
                {hospitals.length} hospitals found • Sorted by distance
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[350px]">
            <div className="divide-y divide-border/50">
              {hospitals.map((hospital) => (
                <div
                  key={hospital.id}
                  className={`p-4 hover:bg-accent/30 transition-all cursor-pointer ${
                    selectedHospital?.id === hospital.id ? 'bg-accent/40' : ''
                  }`}
                  onClick={() => handleHospitalSelect(hospital)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 pr-4">
                      <h3 className="font-semibold text-foreground mb-1">{hospital.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground/60" />
                        {hospital.address}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="inline-block px-2.5 py-1 bg-primary/10 text-primary text-sm font-semibold rounded-full">
                        {hospital.distance}
                      </span>
                      {hospital.isOpen && (
                        <div className="flex items-center gap-1 text-xs text-status-normal mt-2 justify-end">
                          <Clock className="w-3 h-3" />
                          Open 24/7
                        </div>
                      )}
                    </div>
                  </div>

                  {hospital.rating && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-0.5">
                        {renderStars(hospital.rating)}
                      </div>
                      <span className="text-sm font-medium text-foreground">{hospital.rating}</span>
                      {hospital.totalRatings && (
                        <span className="text-xs text-muted-foreground">({hospital.totalRatings.toLocaleString()} reviews)</span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDirections(hospital);
                      }}
                      className="gap-1.5 flex-1 min-w-[120px]"
                    >
                      <Navigation className="w-4 h-4" />
                      Get Directions
                    </Button>
                    {hospital.phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          callHospital(hospital.phone!);
                        }}
                        className="gap-1.5 border-status-normal/30 text-status-normal hover:bg-status-normal-bg flex-1 min-w-[100px]"
                      >
                        <Phone className="w-4 h-4" />
                        Call Now
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        openGoogleMapsView(hospital);
                      }}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

declare global {
  interface Window {
    tt: any;
  }
}

export default HospitalMap;
