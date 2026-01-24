import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Navigation, Phone, Clock, Loader2, Search, ExternalLink, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Hospital {
  id: string;
  name: string;
  address: string;
  distance: string;
  phone?: string;
  isOpen?: boolean;
  rating?: number;
  lat: number;
  lng: number;
}

const HospitalMap: React.FC = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [manualLocation, setManualLocation] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);

  // Demo hospitals for fallback (Chennai-based)
  const demoHospitals: Hospital[] = [
    {
      id: '1',
      name: 'Apollo Children\'s Hospital',
      address: '15, Shafee Mohammed Rd, Chennai 600006',
      distance: '2.3 km',
      phone: '+91 44 2829 0200',
      isOpen: true,
      rating: 4.5,
      lat: 13.0569,
      lng: 80.2425,
    },
    {
      id: '2',
      name: 'Kanchi Kamakoti CHILDS Trust Hospital',
      address: '12A, Nageswara Rd, Nungambakkam, Chennai 600034',
      distance: '3.8 km',
      phone: '+91 44 4200 0500',
      isOpen: true,
      rating: 4.7,
      lat: 13.0603,
      lng: 80.2388,
    },
    {
      id: '3',
      name: 'Rainbow Children\'s Hospital',
      address: '123, TTK Road, Alwarpet, Chennai 600018',
      distance: '4.2 km',
      phone: '+91 44 4567 8900',
      isOpen: true,
      rating: 4.4,
      lat: 13.0347,
      lng: 80.2516,
    },
    {
      id: '4',
      name: 'SIMS Hospital - Pediatrics',
      address: '1, Jawaharlal Nehru Salai, Vadapalani, Chennai 600026',
      distance: '5.1 km',
      phone: '+91 44 4539 6000',
      isOpen: true,
      rating: 4.3,
      lat: 13.0499,
      lng: 80.2121,
    },
    {
      id: '5',
      name: 'Mehta Children\'s Hospital',
      address: '2, McNichols Rd, Chetpet, Chennai 600031',
      distance: '5.8 km',
      phone: '+91 44 2836 8200',
      isOpen: true,
      rating: 4.6,
      lat: 13.0719,
      lng: 80.2437,
    },
  ];

  const getCurrentLocation = () => {
    setIsLoading(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsLoading(false);
      setHospitals(demoHospitals);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setIsLoading(false);
        // In a real app, we would call an API to get nearby hospitals
        // For now, use demo data
        setHospitals(demoHospitals);
        toast.success('Location found! Showing nearby hospitals.');
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationError('Unable to get your location. Please enter manually or allow location access.');
        setIsLoading(false);
        setHospitals(demoHospitals);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleManualSearch = () => {
    if (!manualLocation.trim()) {
      toast.error('Please enter a location');
      return;
    }
    setIsLoading(true);
    // Simulate search
    setTimeout(() => {
      setHospitals(demoHospitals);
      setIsLoading(false);
      toast.success(`Showing hospitals near "${manualLocation}"`);
    }, 1000);
  };

  const openDirections = (hospital: Hospital) => {
    const destination = encodeURIComponent(hospital.address);
    const origin = userLocation 
      ? `${userLocation.lat},${userLocation.lng}` 
      : '';
    
    const mapsUrl = userLocation
      ? `https://www.google.com/maps/dir/${origin}/${destination}`
      : `https://www.google.com/maps/search/${destination}`;
    
    window.open(mapsUrl, '_blank');
  };

  const callHospital = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  return (
    <div className="space-y-4">
      {/* Emergency Banner */}
      <div className="p-4 rounded-xl bg-status-critical-bg border border-status-critical/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-status-critical mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-status-critical">Emergency?</p>
            <p className="text-sm text-foreground">
              For life-threatening emergencies, call <strong>108</strong> (Ambulance) or <strong>112</strong> (Emergency Services) immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Location Card */}
      <Card className="card-medical">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="w-5 h-5 text-primary" />
            Find Nearby Hospitals
          </CardTitle>
          <CardDescription>
            Locate children's hospitals and pediatric emergency care near you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location Actions */}
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

          {/* Manual Search */}
          <div className="flex gap-2">
            <Input
              value={manualLocation}
              onChange={(e) => setManualLocation(e.target.value)}
              placeholder="Or enter location manually..."
              className="flex-1"
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
            <p className="text-sm text-status-warning">{locationError}</p>
          )}
        </CardContent>
      </Card>

      {/* Hospital List */}
      <Card className="card-medical">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Nearby Hospitals</CardTitle>
          <CardDescription>
            {hospitals.length} pediatric hospitals found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="divide-y">
              {hospitals.map((hospital) => (
                <div
                  key={hospital.id}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{hospital.name}</h3>
                      <p className="text-sm text-muted-foreground">{hospital.address}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-primary">{hospital.distance}</span>
                      {hospital.isOpen && (
                        <div className="flex items-center gap-1 text-xs text-status-normal mt-1">
                          <Clock className="w-3 h-3" />
                          Open 24/7
                        </div>
                      )}
                    </div>
                  </div>

                  {hospital.rating && (
                    <div className="flex items-center gap-1 mb-3">
                      <span className="text-sm text-muted-foreground">Rating:</span>
                      <span className="text-sm font-medium text-foreground">
                        {'★'.repeat(Math.floor(hospital.rating))}
                        {'☆'.repeat(5 - Math.floor(hospital.rating))}
                      </span>
                      <span className="text-sm text-muted-foreground">({hospital.rating})</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => openDirections(hospital)}
                      className="gap-1 flex-1"
                    >
                      <Navigation className="w-4 h-4" />
                      Directions
                    </Button>
                    {hospital.phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => callHospital(hospital.phone!)}
                        className="gap-1 flex-1"
                      >
                        <Phone className="w-4 h-4" />
                        Call
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(hospital.name + ' ' + hospital.address)}`, '_blank')}
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

export default HospitalMap;
