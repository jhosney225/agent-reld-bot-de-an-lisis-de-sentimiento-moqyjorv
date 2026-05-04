```javascript
const axios = require('axios');
const readline = require('readline');

// Simulación de análisis de sentimiento usando API de HuggingFace
// Si no tienes API key, usaremos un análisis local básico

class SentimentAnalyzer {
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY || null;
    this.apiUrl = 'https://api-inference.huggingface.co/models/nlptown/bert-base-multilingual-uncased-sentiment';
    
    // Palabras clave para análisis local
    this.positiveWords = [
      'excelente', 'fantástico', 'maravilloso', 'amor', 'feliz', 'genial', 
      'perfecto', 'hermoso', 'increíble', 'adorable', 'bueno', 'mejor',
      'espléndido', 'magnífico', 'sublime', 'extraordinario', 'wonderful',
      'amazing', 'great', 'excellent', 'beautiful', 'happy', 'love', 'best'
    ];
    
    this.negativeWords = [
      'malo', 'horrible', 'terrible', 'odio', 'triste', 'peor', 'feo',
      'decepción', 'decepcionar', 'aburrido', 'enfado', 'rabia', 'asco',
      'disgusto', 'pésimo', 'awful', 'terrible', 'hate', 'bad', 'worst',
      'ugly', 'sad', 'boring', 'angry', 'furious', 'disappointed'
    ];
    
    this.neutralWords = [
      'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'es', 'son',
      'está', 'están', 'fue', 'fueron', 'será', 'serán', 'the', 'a', 'an'
    ];
  }

  // Análisis local de sentimiento
  analyzeLocal(text) {
    const lowerText = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;

    this.positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      positiveCount += (lowerText.match(regex) || []).length;
    });

    this.negativeWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      negativeCount += (lowerText.match(regex) || []).length;
    });

    const total = positiveCount + negativeCount;
    let sentiment = 'neutral';
    let confidence = 0;

    if (total === 0) {
      sentiment = 'neutral';
      confidence = 0.5;
    } else if (positiveCount > negativeCount) {
      sentiment = 'positivo';
      confidence = Math.min(positiveCount / total, 0.99);
    } else if (negativeCount > positiveCount) {
      sentiment = 'negativo';
      confidence = Math.min(negativeCount / total, 0.99);
    } else {
      sentiment = 'neutral';
      confidence = 0.5;
    }

    return {
      sentiment,
      confidence: parseFloat(confidence.toFixed(2)),
      positiveWords: positiveCount,
      negativeWords: negativeCount,
      method: 'local'
    };
  }

  // Análisis usando API de HuggingFace (si disponible)
  async analyzeWithAPI(text) {
    try {
      if (!this.apiKey) {
        return this.analyzeLocal(text);
      }

      const response = await axios.post(
        this.apiUrl,
        { inputs: text },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`
          }
        }
      );

      const result = response.data[0];
      const labels = result.map(item => ({
        label: item.label,
        score: parseFloat(item.score.toFixed(2))
      }));

      const topLabel = labels[0].label;
      let sentiment = 'neutral';
      
      if (topLabel.includes('positive') || topLabel.includes('POSITIVE')) {
        sentiment = 'positivo';
      } else if (topLabel.includes('negative') || topLabel.includes('NEGATIVE')) {
        sentiment = 'negativo';
      }

      return {
        sentiment,
        confidence: labels[0].score,
        allLabels: labels,
        method: 'api'
      };
    } catch (error) {
      console.log('API no disponible, usando análisis local\n');
      return this.analyzeLocal(text);
    }
  }

  // Procesamiento de múltiples textos
  async analyzeMultiple(texts) {
    const results = [];
    for (const text of texts) {
      const result = await this.analyzeWithAPI(text);
      results.push({
        text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        ...result
      });
    }
    return results;
  }

  // Estadísticas agregadas
  getStatistics(results) {
    const positive = results.filter(r => r.sentiment === 'positivo').length;
    const negative = results.filter(r => r.sentiment === 'negativo').length;
    const neutral = results.filter(r => r.sentiment === 'neutral').length;
    const avgConfidence = (results.reduce((sum, r) => sum + r.confidence, 0) / results.length).toFixed(2);

    return {
      total: results.length,
      positive,
      negative,
      neutral,
      percentagePositive: ((positive / results.length)