"use client";

import { useState, useEffect } from "react";
import {
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";

interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
  appIcon?: string;
  hwnd?: string;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  scaleFactor?: number;
}

export function SourceSelectionModal({
  isOpen,
  setIsOpen,
  onSourceSelected,
}: {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onSourceSelected: (source: ScreenSource) => void;
}) {
  const [sources, setSources] = useState<ScreenSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<ScreenSource | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSources();
    }
  }, [isOpen]);

  const loadSources = async () => {
    setLoading(true);
    try {
      const screenSources = await window.api.screenCapture.getSources();
      setSources(screenSources);
    } catch (error) {
      console.error("Error loading screen sources:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedSource) {
      onSourceSelected(selectedSource);
      setIsOpen(false);
      setSelectedSource(null);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setSelectedSource(null);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleCancel}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel className="max-w-4xl w-full max-h-[90vh] overflow-y-auto space-y-4 border bg-white p-8 rounded-lg shadow-xl">
          <DialogTitle className="text-2xl font-bold">
            Select Screen or Window
          </DialogTitle>
          <Description className="text-gray-600">
            Choose a screen or window to capture. Using hwnd for identification
            to avoid window mismatches.
          </Description>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-gray-600">Loading sources...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
              {sources.map((source) => (
                <div
                  key={source.id}
                  onClick={() => setSelectedSource(source)}
                  className={`cursor-pointer border-2 rounded-lg overflow-hidden transition-all hover:shadow-lg ${
                    selectedSource?.id === source.id
                      ? "border-blue-500 shadow-lg"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="relative aspect-video bg-gray-100">
                    <img
                      src={source.thumbnail}
                      alt={source.name}
                      className="w-full h-full object-cover"
                    />
                    {selectedSource?.id === source.id && (
                      <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                        <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center">
                          ✓
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-white">
                    <div className="flex items-center gap-2">
                      {source.appIcon && (
                        <img
                          src={source.appIcon}
                          alt=""
                          className="w-5 h-5"
                        />
                      )}
                      <p className="text-sm font-medium truncate flex-1">
                        {source.name}
                      </p>
                    </div>
                    {source.hwnd && (
                      <p className="text-xs text-gray-500 mt-1">
                        HWND: {source.hwnd}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-4 pt-4 border-t">
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedSource}
              className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                selectedSource
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              Start Capture
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
