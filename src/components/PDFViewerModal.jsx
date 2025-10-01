import React, { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "./PDFViewerModal.css";

// ✅ Use local worker from public folder
pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.js`;

const PDFViewerModal = ({ open, fileUrl, onClose }) => {
  const [numPages, setNumPages] = useState(null);

  useEffect(() => {
    setNumPages(null); // reset page count on file change
  }, [fileUrl]);

  if (!open) return null;

  return (
    <div className="pdf-modal-backdrop" onClick={onClose}>
      <div className="pdf-modal-content" onClick={e => e.stopPropagation()}>
        <button className="pdf-close-btn" onClick={onClose}>×</button>
        {fileUrl ? (
          <Document
            file={fileUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={<p>Loading PDF...</p>}
            error={<p>Could not load PDF.</p>}
          >
            {Array.from(new Array(numPages || 1), (el, idx) => (
              <Page key={idx} pageNumber={idx + 1} width={600} />
            ))}
          </Document>
        ) : (
          <p>No PDF available</p>
        )}
      </div>
    </div>
  );
};

export default PDFViewerModal;
  