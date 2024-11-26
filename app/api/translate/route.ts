import { NextResponse } from "next/server";
import axios from "axios";
import { pinyin } from 'pinyin-pro';

interface TranslationResponse {
  english?: string;
  pinyin?: string;
  original: string;
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    
    const response: TranslationResponse = {
      original: text
    };

    // Get pinyin with number notation then convert to marks
    response.pinyin = pinyin(text, { 
      toneType: 'num',
      type: 'array',
      nonZh: 'consecutive'
    }).join(' ').replace(/([a-z]+)(\d)/gi, (_, letters, tone) => {
      const toneMarks: { [key: string]: string } = {
        '1': 'ˉ',
        '2': '´',
        '3': 'ˇ',
        '4': '`',
        '5': ''
      };
      return `${letters}${toneMarks[tone] || ''}`;
    });

    if (/[\u4e00-\u9fff]/.test(text)) {
      try {
        const translationResponse = await axios.post(
          `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`,
          {
            q: text,
            source: 'zh-TW',
            target: 'en'
          }
        );
        
        response.english = translationResponse.data.data.translations[0].translatedText;
      } catch (error) {
        console.error('Translation error:', error);
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { error: 'Translation processing failed' },
      { status: 500 }
    );
  }
} 