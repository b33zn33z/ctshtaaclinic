import React, { useState } from 'react';

export default function PatientDataEntry() {
  const [loading, setLoading] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const [caseType, setCaseType] = useState('Cardiac');

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl.split(',')[1]);
        };
      };
    });
  };

  const handleFileDrop = async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;

    setLoading(true);
    try {
      const processedFiles = [];
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const base64Data = await compressImage(file);
          processedFiles.push({ name: file.name, type: 'image', mediaType: 'image/jpeg', data: base64Data });
        } else if (file.type === 'application/pdf') {
          const reader = new FileReader();
          const base64Promise = new Promise((res) => {
            reader.onload = () => res(reader.result.split(',')[1]);
            reader.readAsDataURL(file);
          });
          const base64Data = await base64Promise;
          processedFiles.push({ name: file.name, type: 'pdf', mediaType: 'application/pdf', data: base64Data });
        }
      }

      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: processedFiles, caseType })
      });
      
      const data = await res.json();
      setPatientData(data);
    } catch (err) {
      alert('Error extracting patient data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsApp = () => {
    if (!patientData?.phone) return alert("No phone number available");
    const message = `Hello ${patientData.name}, this is the Cardiothoracic Surgery team. We have reviewed your clinical records regarding your ${caseType.toLowerCase()} case. We would like to arrange an appointment to set up your upcoming operation.`;
    const url = `https://wa.me/${patientData.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '30px', maxWidth: '800px', margin: '50px auto', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#1f2937' }}>Clinic Data Entry Portal</h2>
      
      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
        <button onClick={() => setCaseType('Cardiac')} style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: '500', cursor: 'pointer', border: 'none', backgroundColor: caseType === 'Cardiac' ? '#dc2626' : '#e5e7eb', color: caseType === 'Cardiac' ? '#fff' : '#374151' }}>
          ❤️ 1. Cardiac Case
        </button>
        <button onClick={() => setCaseType('Thoracic')} style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: '500', cursor: 'pointer', border: 'none', backgroundColor: caseType === 'Thoracic' ? '#2563eb' : '#e5e7eb', color: caseType === 'Thoracic' ? '#fff' : '#374151' }}>
          🫁 2. Thoracic Case
        </button>
      </div>

      <div onDragOver={(e) => e.preventDefault()} onDrop={handleFileDrop} style={{ border: '3px dashed #d1d5db', borderRadius: '12px', padding: '50px', textAlign: 'center', backgroundColor: '#f9fafb', cursor: 'pointer' }}>
        {loading ? (
          <p style={{ color: '#2563eb', fontWeight: '600' }}>Compressing files & running Gemini extraction...</p>
        ) : (
          <p style={{ color: '#6b7280' }}>Drag and drop clinic letters, medical reports, or lab photos here</p>
        )}
      </div>

      {patientData && (
        <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '15px', borderBottom: '2px solid #e5e7eb', paddingBottom: '10px', color: '#374151' }}>Extracted Case Review</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', color: '#4b5563' }}>
            <p><strong>Patient Name:</strong> {patientData.name}</p>
            <p><strong>Age/Gender:</strong> {patientData.age} / {patientData.gender}</p>
            <p><strong>Contact Number:</strong> {patientData.phone}</p>
            <p><strong>Diagnosis:</strong> {patientData.diagnosis}</p>
          </div>
          <div style={{ marginBottom: '25px' }}>
            <p style={{ fontWeight: 'bold', color: '#374151' }}>Surgical Plan / Urgency Notes:</p>
            <p style={{ padding: '12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '5px', fontSize: '14px', color: '#4b5563', fontFamily: 'monospace' }}>{patientData.surgicalNotes}</p>
          </div>
          <button onClick={sendWhatsApp} style={{ w: '100%', width: '100%', backgroundColor: '#16a34a', color: '#fff', padding: '14px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
            💬 Pre-fill WhatsApp & Setup Operation
          </button>
        </div>
      )}
    </div>
  );
}