
import axios from 'axios';

/**
 * Uploads audio to local backend for offline transcription using Python/Whisper
 */
export const transcribeAudio = async (audioFile, onProgress) => {
    try {
        console.log('📤 Uploading audio to backend for transcription...');
        onProgress && onProgress(10, 'Uploading...');

        const formData = new FormData();
        formData.append('audio', audioFile);

        const response = await axios.post('/api/transcribe', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                // Map upload progress 0-50%
                onProgress && onProgress(Math.floor(percentCompleted / 2), 'Uploading...');
            }
        });

        onProgress && onProgress(100, 'Done');

        if (response.data.text) {
            console.log('✅ Transcription:', response.data.text);
            return response.data.text;
        } else {
            throw new Error('No text returned');
        }

    } catch (error) {
        console.error('Backend Transcription Failed:', error);

        let msg = 'Transcription failed';
        if (error.response?.data?.error) {
            msg = `Error: ${error.response.data.error}`;
            if (error.response.data.details) {
                console.error(error.response.data.details);
            }
        }
        throw new Error(msg);
    }
};

export const initWhisper = () => Promise.resolve(true); // No-op for API
export const isWhisperReady = () => true;
