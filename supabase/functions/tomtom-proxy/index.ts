import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("TOMTOM_API_KEY");
    if (!apiKey) {
      throw new Error("TOMTOM_API_KEY not configured");
    }

    const { action, params } = await req.json();

    let url: string;

    switch (action) {
      case "geocode": {
        const query = encodeURIComponent(params.query);
        url = `https://api.tomtom.com/search/2/geocode/${query}.json?key=${apiKey}&limit=${params.limit || 1}`;
        break;
      }
      case "poiSearch": {
        const query = encodeURIComponent(params.query);
        url = `https://api.tomtom.com/search/2/poiSearch/${query}.json?key=${apiKey}&lat=${params.lat}&lon=${params.lon}&radius=${params.radius || 10000}&limit=${params.limit || 5}&categorySet=${params.categorySet || "7321"}`;
        break;
      }
      case "route": {
        url = `https://api.tomtom.com/routing/1/calculateRoute/${params.startLat},${params.startLng}:${params.endLat},${params.endLng}/json?key=${apiKey}&traffic=true&travelMode=car`;
        break;
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error("TomTom API error:", response.status, data);
      return new Response(
        JSON.stringify({ error: "TomTom API error", status: response.status, details: data }),
        { status: response.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify(data),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in tomtom-proxy:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
