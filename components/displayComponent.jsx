'use client'

import React, { useState } from 'react';
import MenuUpload from "./MenuUpload";
import PerformOCRButton from './performOCR.button';
import TranslateButton from "./TranslateButton"; // Assuming this is similar

export default function displayComponent() {
  const [menuImageUrl, setMenuImageUrl] = useState('');

  return (
    <div className="flex flex-col min-h-0 w-full">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex flex-col gap-2 p-6">
            <div className="flex items-center gap-4">
              <MenuUpload onImageUpload={setMenuImageUrl} />
              <PerformOCRButton imageUrl={menuImageUrl} disabled={!menuImageUrl} />
              <TranslateButton imageUrl={menuImageUrl} />
            </div>
            <div className="border border-dashed border-gray-200 rounded-lg grid w-full p-6 text-center text-sm place-items-center gap-1 dark:border-gray-800">
              Drop a menu image here or click to upload.
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800" />
          <div className="flex flex-col gap-2 p-6">
            <div className="border border-dashed border-gray-200 rounded-lg grid w-full p-6 text-center text-sm place-items-center gap-1 dark:border-gray-800">
              OCR and translation results will appear here.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
