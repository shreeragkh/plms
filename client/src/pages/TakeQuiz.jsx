import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizService, quizAttemptService } from '../services';
import { CheckCircle, XCircle, Clock, Loader2, ArrowLeft, Award } from 'lucide-react';

const STORAGE_KEY = (quizId) => `quiz_progress_${quizId}`;

export default function TakeQuiz() {
  const { quizId }  = useParams();
  const navigate    = useNavigate();

  const [quiz,        setQuiz]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [answers,     setAnswers]     = useState({});   // { questionId: selectedAnswer }
  const [submitted,   setSubmitted]   = useState(false);
  const [result,      setResult]      = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');
  const [timeLeft,    setTimeLeft]    = useState(null);
  const [startTime]                   = useState(Date.now());

  // Load quiz
  useEffect(() => {
    quizService.getById(quizId)
      .then((res) => {
        setQuiz(res.quiz);
        if (res.quiz.timeLimit > 0) setTimeLeft(res.quiz.timeLimit * 60);

        // Restore saved progress if any
        const saved = localStorage.getItem(STORAGE_KEY(quizId));
        if (saved) {
          try { setAnswers(JSON.parse(saved)); } catch (_) {}
        }
      })
      .catch(() => setError('Could not load quiz.'))
      .finally(() => setLoading(false));
  }, [quizId]);

  // Save progress to localStorage whenever answers change
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem(STORAGE_KEY(quizId), JSON.stringify(answers));
    }
  }, [answers, quizId]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft <= 0) { handleSubmit(true); return; }
    const t = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, submitted]);

  const handleAnswer = (questionIdx, option) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionIdx]: option }));
  };

  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (submitting || submitted) return;
    setSubmitting(true);
    setError('');

    const timeTaken = Math.round((Date.now() - startTime) / 1000);
    const answersArray = quiz.questions.map((q, idx) => ({
      questionId:     q._id || String(idx),
      selectedAnswer: answers[idx] || '',
    }));

    try {
      const res = await quizAttemptService.submit({
        quizId,
        answers: answersArray,
        timeTaken,
      });
      setResult(res.result);
      setSubmitted(true);
      // Clear saved progress now that it's submitted
      localStorage.removeItem(STORAGE_KEY(quizId));
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }, [quiz, answers, quizId, startTime, submitting, submitted]);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white gap-3">
      <Loader2 size={24} className="animate-spin text-blue-400" />
      <span>Loading quiz...</span>
    </div>
  );

  if (error && !quiz) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">
      <div className="text-center space-y-4">
        <XCircle size={48} className="text-red-400 mx-auto" />
        <p className="text-lg">{error}</p>
        <button onClick={() => navigate(-1)} className="bg-blue-600 px-6 py-2 rounded-lg hover:bg-blue-500">Go Back</button>
      </div>
    </div>
  );

  // ── Result screen ─────────────────────────────────────────────────────────
  if (submitted && result) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white p-6">
      <div className="bg-[#1e293b] border border-gray-700 rounded-2xl p-8 max-w-md w-full text-center space-y-5">
        <Award size={56} className={`mx-auto ${result.percentage >= 60 ? 'text-yellow-400' : 'text-gray-400'}`} />
        <h2 className="text-2xl font-bold">Quiz Complete!</h2>

        <div className={`text-5xl font-black ${
          result.percentage >= 80 ? 'text-green-400' :
          result.percentage >= 60 ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {result.percentage}%
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-[#0f172a] p-3 rounded-xl">
            <p className="text-gray-400 text-xs mb-1">Score</p>
            <p className="font-bold">{result.score}/{result.totalMarks}</p>
          </div>
          <div className="bg-[#0f172a] p-3 rounded-xl">
            <p className="text-gray-400 text-xs mb-1">Correct</p>
            <p className="font-bold text-green-400">{result.correctAnswers}/{result.totalQuestions}</p>
          </div>
          <div className="bg-[#0f172a] p-3 rounded-xl">
            <p className="text-gray-400 text-xs mb-1">Attempt</p>
            <p className="font-bold">#{result.attemptNumber}</p>
          </div>
        </div>

        <p className="text-gray-300 text-sm bg-[#0f172a] p-4 rounded-xl">{result.feedback}</p>

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/student')}
            className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-semibold transition"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => navigate('/recommendations')}
            className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-xl font-semibold transition"
          >
            More Resources
          </button>
        </div>
      </div>
    </div>
  );

  // ── Quiz attempt screen ───────────────────────────────────────────────────
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const total         = quiz.questions.length;
  const progressPct   = Math.round((answeredCount / total) * 100);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition">
            <ArrowLeft size={16} /> Back
          </button>
          {timeLeft !== null && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm
              ${timeLeft < 60 ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-slate-800 text-white'}`}>
              <Clock size={15} /> {formatTime(timeLeft)}
            </div>
          )}
        </div>

        {/* Quiz title + progress */}
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-gray-800 mb-6">
          <h1 className="text-xl font-bold mb-1">{quiz.title}</h1>
          {quiz.description && <p className="text-gray-400 text-sm mb-4">{quiz.description}</p>}
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>{answeredCount} of {total} answered</span>
            <span>{total} questions • {quiz.totalMarks} marks</span>
          </div>
          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {quiz.questions.map((q, idx) => (
            <div key={idx} className="bg-[#1e293b] border border-gray-800 p-6 rounded-2xl">
              <p className="font-semibold mb-4 text-sm leading-relaxed">
                <span className="text-blue-400 mr-2">Q{idx + 1}.</span>{q.question}
                <span className="text-xs text-gray-500 ml-2">({q.marks || 1} mark{q.marks > 1 ? 's' : ''})</span>
              </p>
              <div className="space-y-2">
                {(q.options || []).map((opt, oi) => {
                  const isSelected = answers[idx] === opt;
                  return (
                    <button
                      key={oi}
                      onClick={() => handleAnswer(idx, opt)}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                        isSelected
                          ? 'bg-blue-600/30 border-blue-500 text-white'
                          : 'bg-[#0f172a] border-gray-700 text-gray-300 hover:border-blue-500/50 hover:bg-blue-600/10'
                      }`}
                    >
                      <span className="text-gray-500 mr-2">{String.fromCharCode(65 + oi)}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/40 text-red-400 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="mt-8 pb-10">
          {answeredCount < total && (
            <p className="text-yellow-400 text-xs text-center mb-3">
              {total - answeredCount} question{total - answeredCount > 1 ? 's' : ''} unanswered — you can still submit.
            </p>
          )}
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-bold text-lg hover:scale-[1.01] transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting
              ? <><Loader2 size={20} className="animate-spin" /> Submitting...</>
              : <><CheckCircle size={20} /> Submit Quiz</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
