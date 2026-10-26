import React, { useState, useEffect } from 'react';
import { request } from '../services/api';

const SubjectsDashboard = ({ go, selectSubject, accessToken, showToast }) => {
  const [subjects, setSubjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const data = await request('/subjects', { headers: { Authorization: `Bearer ${accessToken}` } });
      setSubjects(data);
    } catch (e) {
      showToast("Failed to fetch subjects");
      console.error(e);
    }
  };

  const handleCreate = async () => {
    try {
      await request('/subjects', { method: 'POST', body: JSON.stringify(newSubject), headers: { Authorization: `Bearer ${accessToken}` } });
      setIsModalOpen(false);
      setNewSubject({ name: '', description: '' });
      fetchSubjects();
      showToast("Subject created!");
    } catch (e) {
      showToast("Failed to create subject");
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    try {
      await request(`/subjects/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
      fetchSubjects();
      showToast("Subject deleted!");
    } catch (e) {
      showToast("Failed to delete subject");
      console.error(e);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50 dark:bg-[#0a0a0a]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold dark:text-white">Subjects Dashboard</h1>
        <button className="sa-btn-primary px-4 py-2" onClick={() => setIsModalOpen(true)}>Create Subject</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map(s => (
          <div key={s.id} className="sa-card p-6 cursor-pointer flex flex-col justify-between hover:shadow-lg transition-all dark:bg-[#1c1c1c] dark:border-gray-800" onClick={() => { selectSubject(s.id); go("predict-paper"); }}>
            <div>
              <h3 className="text-xl font-semibold mb-2 dark:text-white">{s.name}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{s.description}</p>
            </div>
            <div className="flex justify-between text-sm text-gray-500 border-t pt-4 dark:border-gray-800">
              <span>{s.document_count} Notes</span>
              <span>{s.past_paper_count} Past Papers</span>
            </div>
            <div className="mt-4 flex gap-2">
                <button className="sa-btn-outline w-full text-xs py-2" onClick={(e) => { e.stopPropagation(); go("upload", { subject_id: s.id, type: "NOTES" }); }}>Upload Notes</button>
                <button className="sa-btn-outline w-full text-xs py-2" onClick={(e) => { e.stopPropagation(); selectSubject(s.id); go("predict-paper", { subjectId: s.id, openUpload: true }); }}>Upload Past Paper</button>
                <button className="bg-red-500 text-white rounded px-2 py-2" onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}>X</button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="sa-card p-6 w-full max-w-md">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-semibold">Create New Subject</h2>
              <button onClick={() => setIsModalOpen(false)}>X</button>
            </div>
            <div className="flex flex-col gap-4">
              <input 
                className="sa-input w-full p-2 border rounded"
                placeholder="Subject Name (e.g. Computer Networks)" 
                value={newSubject.name} 
                onChange={e => setNewSubject({...newSubject, name: e.target.value})} 
              />
              <input 
                className="sa-input w-full p-2 border rounded"
                placeholder="Description" 
                value={newSubject.description} 
                onChange={e => setNewSubject({...newSubject, description: e.target.value})} 
              />
              <button className="sa-btn-primary p-2 mt-2" onClick={handleCreate}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectsDashboard;
