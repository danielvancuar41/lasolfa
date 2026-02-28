export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'Immagine mancante' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key non configurata su Vercel' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: image
                }
              },
              {
                type: 'text',
                text: `Guarda questa immagine di un prodotto alimentare o del suo codice a barre / etichetta.
Rispondi SOLO con un JSON nel formato:
{"nome": "Nome del prodotto", "categoria": "Categoria"}

Categorie disponibili: Latticini, Carni, Conserve, Farine & Pasta, Grassi & Oli, Spezie & Condimenti, Dolciumi, Altro

Il nome deve essere conciso (es. "Pecorino Romano", "Burro senza lattosio", "Olio EVO").
Se non riesci a identificare il prodotto, rispondi: {"nome": null, "categoria": null}
Niente altro testo, solo il JSON.`
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      return res.status(500).json({ error: 'Errore API Claude: ' + errBody });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    // Estrai JSON dalla risposta
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'Risposta AI non valida' });

    const parsed = JSON.parse(match[0]);
    return res.status(200).json(parsed);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
