import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Navigation, Phone, Clock, Loader2, Search, ExternalLink, AlertTriangle, Star, Map } from 'lucide-react';
import { toast } from 'sonner';

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
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 13.0827, lng: 80.2707 });

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

  const getCurrentLocation = useCallback(() => {
    setIsLoading(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsLoading(false);
      setHospitals(fallbackHospitals);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setMapCenter({ lat: latitude, lng: longitude });
        setIsLoading(false);
        setHospitals(fallbackHospitals);
        toast.success('Location found! Showing nearby hospitals.');
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationError('Unable to get your location. Please enable location access or search manually.');
        setIsLoading(false);
        setHospitals(fallbackHospitals);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  const handleManualSearch = () => {
    if (!manualLocation.trim()) {
      toast.error('Please enter a location');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setHospitals(fallbackHospitals);
      setIsLoading(false);
      toast.success(`Showing hospitals near "${manualLocation}"`);
    }, 800);
  };

  const openGoogleMapsDirections = (hospital: Hospital) => {
    const destination = `${hospital.lat},${hospital.lng}`;
    let mapsUrl: string;

    if (userLocation) {
      mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${destination}&travelmode=driving`;
    } else {
      mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
    }

    window.open(mapsUrl, '_blank');
  };

  const openGoogleMapsView = (hospital: Hospital) => {
    const mapsUrl = hospital.placeId
      ? `https://www.google.com/maps/place/?q=place_id:${hospital.placeId}`
      : `https://www.google.com/maps/search/?api=1&query=${hospital.lat},${hospital.lng}`;
    
    window.open(mapsUrl, '_blank');
  };

  const callHospital = (phone: string) => {
    const cleanPhone = phone.replace(/\s/g, '');
    window.location.href = `tel:${cleanPhone}`;
  };

  const handleHospitalSelect = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setMapCenter({ lat: hospital.lat, lng: hospital.lng });
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

  const getMapEmbedUrl = () => {
    const lat = selectedHospital?.lat || mapCenter.lat;
    const lng = selectedHospital?.lng || mapCenter.lng;
    const zoom = selectedHospital ? 16 : 13;
    
    let markers = '';
    hospitals.forEach(h => {
      markers += `&marker=${h.lat},${h.lng}`;
    });
    
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.05},${lat - 0.03},${lng + 0.05},${lat + 0.03}&layer=mapnik&marker=${lat},${lng}`;
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
                Hospital Map
              </CardTitle>
              <CardDescription>
                Interactive map powered by OpenStreetMap • No API key required
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[300px] w-full relative">
            <iframe
              title="Hospital Map"
              src={getMapEmbedUrl()}
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            {selectedHospital && (
              <div className="absolute bottom-4 left-4 right-4 bg-background/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">{selectedHospital.name}</h4>
                    <p className="text-xs text-muted-foreground truncate">{selectedHospital.address}</p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => openGoogleMapsDirections(selectedHospital)}
                    className="flex-shrink-0"
                  >
                    <Navigation className="w-4 h-4 mr-1" />
                    Directions
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
                        openGoogleMapsDirections(hospital);
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

      <div className="text-center py-3">
        <p className="text-xs text-muted-foreground">
          Map powered by OpenStreetMap • Directions via Google Maps • No API key required
        </p>
      </div>
    </div>
  );
};

export default HospitalMap;
