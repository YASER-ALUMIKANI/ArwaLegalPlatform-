import { apiClient } from './api';
import { API_BASE } from '../config/api';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const documentsService = {
  analyze: (id, docType) => apiClient(`/documents/${id}/analyze?doc_type=${docType}`, { method: 'POST' }),
  
  upload: (file, caseId, onProgress) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('يرجى اختيار ملف قبل الرفع.'));
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        reject(new Error('حجم الملف يتجاوز الحد المسموح 10 ميجابايت.'));
        return;
      }

      if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
        reject(new Error('نوع الملف غير مدعوم. الصيغ المسموحة: PDF, DOC, DOCX, JPG, PNG.'));
        return;
      }

      const token = localStorage.getItem('arwa_token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('case_id', caseId);
      formData.append('token', token);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/documents/upload`, true);

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve(xhr.responseText);
          }
        } else {
          try {
            const resJson = JSON.parse(xhr.responseText);
            reject(new Error(resJson.detail || 'فشل رفع المستند.'));
          } catch {
            reject(new Error('فشل رفع المستند.'));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('حدث خطأ في الاتصال أثناء رفع المستند.'));
      };

      xhr.send(formData);
    });
  }
};
