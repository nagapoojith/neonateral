import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ThingSpeakFeed {
  created_at: string;
  entry_id: number;
  field1?: string;
  field2?: string;
  field3?: string;
  field4?: string;
  field5?: string;
}

interface ThingSpeakResponse {
  channel: {
    id: number;
    name: string;
    field1?: string;
    field2?: string;
    field3?: string;
    field4?: string;
    field5?: string;
  };
  feeds: ThingSpeakFeed[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const THINGSPEAK_API_KEY = Deno.env.get('THINGSPEAK_API_KEY');
    const THINGSPEAK_CHANNEL_ID = Deno.env.get('THINGSPEAK_CHANNEL_ID');

    if (!THINGSPEAK_API_KEY) {
      throw new Error('THINGSPEAK_API_KEY is not configured');
    }

    if (!THINGSPEAK_CHANNEL_ID) {
      throw new Error('THINGSPEAK_CHANNEL_ID is not configured');
    }

    const { results = 10 } = await req.json().catch(() => ({ results: 10 }));

    const thingSpeakUrl = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_API_KEY}&results=${results}`;

    const response = await fetch(thingSpeakUrl);
    
    if (!response.ok) {
      throw new Error(`ThingSpeak API error: ${response.status} ${response.statusText}`);
    }

    const data: ThingSpeakResponse = await response.json();

    const vitals = data.feeds.map((feed) => {
      const temperature = feed.field1 ? parseFloat(feed.field1) : null;
      const humidity = feed.field2 ? parseFloat(feed.field2) : null;
      const heartRate = feed.field3 ? parseFloat(feed.field3) : null;
      const spo2 = feed.field4 ? parseFloat(feed.field4) : null;
      const movement = feed.field5 ? parseFloat(feed.field5) : null;

      const validTemp = temperature !== null && !isNaN(temperature) && temperature > -50 && temperature < 50 
        ? parseFloat(temperature.toFixed(1)) 
        : null;

      return {
        timestamp: new Date(feed.created_at).getTime(),
        entryId: feed.entry_id,
        heartRate: heartRate !== null && !isNaN(heartRate) && heartRate > 0 ? Math.round(heartRate) : null,
        spo2: spo2 !== null && !isNaN(spo2) && spo2 > 0 ? Math.round(spo2) : null,
        temperature: validTemp,
        respirationRate: null,
        movement: movement !== null && !isNaN(movement) ? Math.round(movement) : 50,
        humidity: humidity !== null && !isNaN(humidity) ? Math.round(humidity) : null,
      };
    });

    const latestVital = vitals.length > 0 ? vitals[vitals.length - 1] : null;

    return new Response(
      JSON.stringify({
        success: true,
        channel: {
          id: data.channel.id,
          name: data.channel.name,
          fields: {
            field1: data.channel.field1 || 'Heart Rate',
            field2: data.channel.field2 || 'SpO2',
            field3: data.channel.field3 || 'Temperature',
            field4: data.channel.field4 || 'Respiration Rate',
            field5: data.channel.field5 || 'Movement',
          },
        },
        vitals,
        latest: latestVital,
        fetchedAt: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching ThingSpeak data:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
