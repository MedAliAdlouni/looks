import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { apiClient } from '../api/client';
import type { Document as DocumentType, ChatResponse } from '../types/api';
import type { Course } from '../types/api';
import MarkdownMessage from './MarkdownMessage';
import CourseNavigationSidebar from './CourseNavigationSidebar';

// Set up PDF.js worker
// Import the worker from pdfjs-dist package (version 5.4.296 matches react-pdf)
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PDFViewerProps {
  document: DocumentType;
  courseId: string;
  course: Course;
  onClose: () => void;
  documents?: DocumentType[]; // For material outline
}

export default function PDFViewer({ document, courseId, course, onClose, documents = [] }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Document navigation state
  const [originalDocument, setOriginalDocument] = useState<DocumentType>(document);
  const [currentDocument, setCurrentDocument] = useState<DocumentType>(document);
  const [viewingSource, setViewingSource] = useState<{ documentId: string; page: number; chunkText: string } | null>(null);
  const [highlightedText, setHighlightedText] = useState<string | null>(null);
  
  // Chat state
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; sources?: any[]; mode?: 'strict' | 'hybrid' }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [navSidebarCollapsed, setNavSidebarCollapsed] = useState(false);
  const [navSidebarWidth, setNavSidebarWidth] = useState(280);
  const [responseMode, setResponseMode] = useState<'strict' | 'hybrid'>('strict');
  const [verbosity, setVerbosity] = useState<'concise' | 'normal' | 'detailed'>('normal');
  const [settingsExpanded, setSettingsExpanded] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Text selection state
  const [selectedText, setSelectedText] = useState<string>('');
  const [showAddToChatButton, setShowAddToChatButton] = useState(false);
  const [buttonPosition, setButtonPosition] = useState<{ top: number; left: number } | null>(null);
  const selectionRef = useRef<Selection | null>(null);
  
  // Zoom state for smooth zooming
  const zoomAnimationFrameRef = useRef<number | null>(null);
  const pendingScaleRef = useRef<number>(1.2);
  const [isZooming, setIsZooming] = useState(false);
  
  // Sync pendingScaleRef with scale state
  useEffect(() => {
    pendingScaleRef.current = scale;
  }, [scale]);

  // Handle sidebar resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      // Calculate new width based on mouse position from the right edge
      const newWidth = window.innerWidth - e.clientX;
      // Constrain sidebar width between 300px and 800px
      const constrainedWidth = Math.max(300, Math.min(800, newWidth));
      setSidebarWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Change cursor back to default
      window.document.body.style.cursor = '';
      window.document.body.style.userSelect = '';
    };

    if (isResizing) {
      // Prevent text selection and change cursor during resize
      window.document.body.style.cursor = 'col-resize';
      window.document.body.style.userSelect = 'none';
      
      window.document.addEventListener('mousemove', handleMouseMove);
      window.document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.document.removeEventListener('mousemove', handleMouseMove);
        window.document.removeEventListener('mouseup', handleMouseUp);
        window.document.body.style.cursor = '';
        window.document.body.style.userSelect = '';
      };
    }
  }, [isResizing]);

  // Update current document when document prop changes
  useEffect(() => {
    setOriginalDocument(document);
    setCurrentDocument(document);
    setViewingSource(null);
  }, [document]);

  const pdfUrl = apiClient.getDocumentFileUrl(currentDocument.id);

  // Add authorization header to PDF requests
  const loadPdfWithAuth = async (url: string) => {
    const token = localStorage.getItem('token');
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to load PDF');
    }
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  };

  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    
    const loadPdf = async () => {
      setLoading(true);
      setError('');
      // Revoke previous blob URL if it exists
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
      
      try {
        const pdfUrl = apiClient.getDocumentFileUrl(currentDocument.id);
        console.log('Loading PDF from URL:', pdfUrl);
        const url = await loadPdfWithAuth(pdfUrl);
        objectUrl = url;
        console.log('PDF blob URL created:', url);
        setPdfBlobUrl(url);
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [currentDocument.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Function to add selected text to chat
  const addTextToChat = useCallback((text: string) => {
    setInputMessage(prev => prev ? `${prev}\n\nSelected text: "${text}"` : `Selected text: "${text}"`);
    // Focus on chat input - use window.document to avoid shadowing the document prop
    const chatInput = window.document.querySelector('input[type="text"]') as HTMLInputElement;
    if (chatInput) {
      chatInput.focus();
      chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
    }
    // Clear selection and hide button
    window.getSelection()?.removeAllRanges();
    setShowAddToChatButton(false);
    setSelectedText('');
  }, []);

  // Handle text selection and Ctrl+L shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
          const text = selection.toString().trim();
          addTextToChat(text);
        }
      }
    };

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        selectionRef.current = selection;
        const text = selection.toString().trim();
        setSelectedText(text);
        
        // Get the position of the selection to show the button
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = pdfContainerRef.current?.getBoundingClientRect();
        
        if (containerRect) {
          // Position button above the selection, centered horizontally
          setButtonPosition({
            top: rect.top - containerRect.top - 40, // 40px above selection
            left: rect.left - containerRect.left + (rect.width / 2) - 50, // Centered, offset by half button width
          });
          setShowAddToChatButton(true);
        }
      } else {
        setShowAddToChatButton(false);
        setSelectedText('');
        selectionRef.current = null;
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      // Hide button if clicking outside the selection area
      if (showAddToChatButton && pdfContainerRef.current) {
        const target = e.target as Node;
        if (!pdfContainerRef.current.contains(target)) {
          setShowAddToChatButton(false);
        }
      }
    };

    const handleScroll = () => {
      // Hide button when scrolling
      if (showAddToChatButton) {
        setShowAddToChatButton(false);
        window.getSelection()?.removeAllRanges();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.document.addEventListener('selectionchange', handleSelectionChange);
    window.document.addEventListener('click', handleClickOutside);
    const container = pdfContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.document.removeEventListener('selectionchange', handleSelectionChange);
      window.document.removeEventListener('click', handleClickOutside);
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [showAddToChatButton, addTextToChat]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('PDF loaded successfully, pages:', numPages);
    setNumPages(numPages);
    setLoading(false);
    // Scroll to the source page and highlight if we're viewing a source
    if (viewingSource) {
      setTimeout(() => {
        scrollToPage(viewingSource.page);
        setTimeout(() => {
          highlightTextInPDF(viewingSource.chunkText, viewingSource.page);
        }, 800);
      }, 300);
    }
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setError(`Failed to load PDF: ${error.message}`);
    setLoading(false);
  };

  const scrollToPage = (pageNumber: number) => {
    const pageElement = window.document.querySelector(`[data-page-number="${pageNumber}"]`);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle source click - navigate to the document and page
  const handleSourceClick = (source: { document_id: string; document_name: string; page: number; chunk_text: string }) => {
    // Find the document in the documents list
    const targetDoc = documents.find(d => d.id === source.document_id);
    if (targetDoc) {
      setCurrentDocument(targetDoc);
      setViewingSource({ documentId: source.document_id, page: source.page, chunkText: source.chunk_text });
      setHighlightedText(source.chunk_text);
      // Scroll to page and highlight after a short delay to allow PDF to load
      setTimeout(() => {
        scrollToPage(source.page);
        setTimeout(() => {
          highlightTextInPDF(source.chunk_text, source.page);
        }, 500);
      }, 500);
    } else {
      // If document not found in list, try to load it
      console.warn('Document not found in documents list:', source.document_id);
    }
  };

  // Handle back to original document
  const handleBackToOriginal = () => {
    setCurrentDocument(originalDocument);
    setViewingSource(null);
    setHighlightedText(null);
    // Clear any highlights
    clearHighlights();
  };

  // Handle document selection from navigation sidebar
  const handleNavDocumentSelect = useCallback((selectedDocument: DocumentType, documentCourseId: string) => {
    if (selectedDocument.processing_status === 'completed') {
      // If document is from the same course, just switch to it
      if (documentCourseId === courseId) {
        setCurrentDocument(selectedDocument);
        setOriginalDocument(selectedDocument);
        setViewingSource(null);
        setHighlightedText(null);
        clearHighlights();
      } else {
        // Different course - would need to handle course switching
        // For now, just log a warning
        console.warn('Document is from a different course. Course switching not implemented in PDFViewer.');
      }
    }
  }, [courseId]);

  // Handle course selection from navigation sidebar
  const handleNavCourseSelect = useCallback((selectedCourseId: string) => {
    // Course switching would require changing the courseId prop
    // This would need to be handled at a higher level
    console.warn('Course switching not implemented in PDFViewer. Use CourseDetail page instead.');
  }, []);

  // Function to normalize text for matching (remove extra whitespace, normalize line breaks)
  const normalizeText = (text: string): string => {
    return text
      .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
      .replace(/\n+/g, ' ')  // Replace line breaks with space
      .replace(/\r+/g, ' ')  // Replace carriage returns with space
      .trim()
      .toLowerCase();
  };

  // Function to highlight text in PDF using text layer
  const highlightTextInPDF = (textToHighlight: string, pageNumber: number) => {
    if (!textToHighlight || !textToHighlight.trim()) {
      console.warn('No text to highlight');
      return;
    }
    
    // Find the page element
    const pageElement = window.document.querySelector(`[data-page-number="${pageNumber}"]`);
    if (!pageElement) {
      console.warn(`Page ${pageNumber} not found`);
      return;
    }

    // Find the text layer within the page
    const textLayer = pageElement.querySelector('.react-pdf__Page__textContent') as HTMLElement;
    if (!textLayer) {
      console.warn(`Text layer not found for page ${pageNumber}, retrying...`);
      // Try again after a short delay in case text layer is still loading
      setTimeout(() => highlightTextInPDF(textToHighlight, pageNumber), 500);
      return;
    }

    // Ensure text layer has position relative for absolute positioning of highlights
    const textLayerStyle = window.getComputedStyle(textLayer);
    if (textLayerStyle.position === 'static') {
      textLayer.style.position = 'relative';
    }

    // Clear previous highlights
    clearHighlights();

    // Get all text spans in the text layer
    const textSpans = textLayer.querySelectorAll('span');
    if (textSpans.length === 0) {
      console.warn(`No text spans found for page ${pageNumber}, retrying...`);
      setTimeout(() => highlightTextInPDF(textToHighlight, pageNumber), 500);
      return;
    }

    // Build full text content and track span positions
    const spanData: Array<{ span: HTMLElement; text: string; start: number; end: number }> = [];
    let fullText = '';
    
    textSpans.forEach((span) => {
      const text = span.textContent || '';
      const start = fullText.length;
      const end = start + text.length;
      spanData.push({ span: span as HTMLElement, text, start, end });
      fullText += text;
    });
    
    // Normalize both texts for comparison
    const normalizedSearchText = normalizeText(textToHighlight);
    const normalizedFullText = normalizeText(fullText);
    
    // Try different lengths for matching (start with longer, fallback to shorter)
    const searchLengths = [300, 200, 100, 50, 30];
    let foundIndex = -1;
    let foundLength = 0;
    
    for (const length of searchLengths) {
      if (normalizedSearchText.length < length) continue;
      
      const searchText = normalizedSearchText.substring(0, length);
      const index = normalizedFullText.indexOf(searchText);
      
      if (index !== -1) {
        foundIndex = index;
        foundLength = length;
        console.log(`Found match with length ${length} at index ${index}`);
        break;
      }
    }
    
    if (foundIndex === -1) {
      // Last resort: try to find any significant words from the chunk
      const words = normalizedSearchText.split(/\s+/).filter(w => w.length > 5);
      if (words.length > 0) {
        // Try to find a sequence of 3-5 words
        for (let wordCount = Math.min(5, words.length); wordCount >= 3; wordCount--) {
          const wordSequence = words.slice(0, wordCount).join(' ');
          const index = normalizedFullText.indexOf(wordSequence);
          if (index !== -1) {
            foundIndex = index;
            foundLength = wordSequence.length;
            console.log(`Found match using word sequence of ${wordCount} words`);
            break;
          }
        }
      }
      
      if (foundIndex === -1) {
        console.warn('Chunk text not found in PDF text layer', {
          searchTextLength: normalizedSearchText.length,
          fullTextLength: normalizedFullText.length,
          first50Chars: normalizedSearchText.substring(0, 50),
          pdfFirst50Chars: normalizedFullText.substring(0, 50)
        });
        return;
      }
    }

    // Map normalized index back to original text positions
    // Since we normalized, we need to find spans that contain the matching text
    // Use a simpler approach: find spans whose normalized text is part of the match
    highlightMatchingSpans(spanData, textLayer, normalizedSearchText, foundIndex, foundLength);
  };

  // Helper function to highlight matching spans
  const highlightMatchingSpans = (
    spanData: Array<{ span: HTMLElement; text: string; start: number; end: number }>,
    textLayer: HTMLElement,
    normalizedSearchText: string,
    foundIndex: number,
    foundLength: number
  ) => {
    const textLayerRect = textLayer.getBoundingClientRect();
    const normalizedEndIndex = foundIndex + foundLength;
    let firstSpan: HTMLElement | null = null;
    let highlightedCount = 0;

    // Build normalized text from spans to find which spans match
    let normalizedCurrentIndex = 0;
    const matchingSpans: Array<{ span: HTMLElement; text: string; normalizedStart: number; normalizedEnd: number }> = [];

    spanData.forEach((spanInfo) => {
      const { span, text } = spanInfo;
      const normalizedText = normalizeText(text);
      const normalizedSpanStart = normalizedCurrentIndex;
      const normalizedSpanEnd = normalizedCurrentIndex + normalizedText.length;

      // Check if this span overlaps with our found match
      if (normalizedSpanEnd > foundIndex && normalizedSpanStart < normalizedEndIndex) {
        matchingSpans.push({
          span,
          text,
          normalizedStart: normalizedSpanStart,
          normalizedEnd: normalizedSpanEnd
        });
      }

      normalizedCurrentIndex = normalizedSpanEnd;
    });

    // Highlight all matching spans
    matchingSpans.forEach((spanInfo) => {
      const { span, text } = spanInfo;
      const spanRect = span.getBoundingClientRect();
      const relativeLeft = spanRect.left - textLayerRect.left;
      const relativeTop = spanRect.top - textLayerRect.top;
      
      // Create a highlight overlay
      const highlight = window.document.createElement('div');
      highlight.className = 'pdf-highlight';
      highlight.style.position = 'absolute';
      highlight.style.backgroundColor = '#ffeb3b';
      highlight.style.opacity = '0.7';
      highlight.style.pointerEvents = 'none';
      highlight.style.zIndex = '10';
      highlight.style.borderRadius = '3px';
      highlight.style.boxShadow = '0 0 0 1px rgba(255, 235, 59, 0.8)';
      
      highlight.style.left = `${relativeLeft}px`;
      highlight.style.top = `${relativeTop}px`;
      highlight.style.width = `${spanRect.width}px`;
      highlight.style.height = `${spanRect.height}px`;
      
      textLayer.appendChild(highlight);
      highlightedCount++;

      if (!firstSpan) {
        firstSpan = span;
      }
    });

    console.log(`Highlighted ${highlightedCount} spans`);

    // Scroll to the first highlighted span
    if (firstSpan) {
      setTimeout(() => {
        firstSpan!.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  // Function to clear all highlights
  const clearHighlights = () => {
    const highlights = window.document.querySelectorAll('.pdf-highlight');
    highlights.forEach(highlight => {
      highlight.remove();
    });
  };

  // Handle trackpad/mouse wheel zoom with smooth updates
  useEffect(() => {
    const updateScale = () => {
      if (zoomAnimationFrameRef.current) {
        cancelAnimationFrame(zoomAnimationFrameRef.current);
      }
      
      zoomAnimationFrameRef.current = requestAnimationFrame(() => {
        setScale(pendingScaleRef.current);
        zoomAnimationFrameRef.current = null;
      });
    };

    const handleWheel = (e: WheelEvent) => {
      // Trackpad pinch-to-zoom gestures typically trigger wheel events with ctrlKey or metaKey
      // Ctrl on Windows/Linux, Cmd (metaKey) on Mac
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        
        // Calculate zoom delta
        // Negative deltaY means zooming in (pinch out), positive means zooming out (pinch in)
        // Reduced sensitivity for smoother, more controlled zooming
        const zoomSensitivity = 0.002;
        const zoomDelta = -e.deltaY * zoomSensitivity;
        
        // Update pending scale immediately for visual feedback
        pendingScaleRef.current = Math.max(0.5, Math.min(3, pendingScaleRef.current + zoomDelta));
        
        // Throttle actual scale updates using requestAnimationFrame
        // This keeps the PDF visible during zoom gestures
        updateScale();
      }
      // If not a zoom gesture, allow normal scrolling
    };

    const container = pdfContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      
      return () => {
        container.removeEventListener('wheel', handleWheel);
        if (zoomAnimationFrameRef.current) {
          cancelAnimationFrame(zoomAnimationFrameRef.current);
        }
      };
    }
  }, []); // Empty dependency array - we use refs to access current scale

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setSending(true);
    setError('');

    try {
      const response: ChatResponse = await apiClient.sendMessage(courseId, {
        message: userMessage,
        conversation_id: conversationId,
        mode: responseMode,
        verbosity: verbosity,
      });

      setConversationId(response.conversation_id);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response.content,
          sources: response.sources,
          mode: response.mode || responseMode,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setMessages(prev => prev.slice(0, -1)); // Remove user message on error
    } finally {
      setSending(false);
    }
  };

  // Validate document prop
  if (!document || !document.id) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button onClick={onClose} style={styles.backButton}>← Back</button>
            <h2 style={styles.title}>Error</h2>
          </div>
        </div>
        <div style={styles.content}>
          <div style={styles.error}>
            <p>Invalid document. Please select a document to view.</p>
            <button onClick={onClose} style={styles.closeButton}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  // Don't return early - always show the container with header
  // This ensures the UI is always visible even while loading
  console.log('PDFViewer rendering:', { 
    documentId: document?.id, 
    pdfBlobUrl: !!pdfBlobUrl, 
    numPages, 
    loading, 
    error 
  });

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
              {viewingSource && currentDocument.id !== originalDocument.id ? (
            <>
              <button onClick={handleBackToOriginal} style={styles.backButton}>← Back to {originalDocument.filename}</button>
              <h2 style={styles.title}>{currentDocument?.filename || 'Document'}</h2>
              {viewingSource && (
                <span style={{ ...styles.pageInfo, color: '#007bff', fontWeight: 'bold' }}>
                  Viewing page {viewingSource.page} (highlighted)
                </span>
              )}
            </>
          ) : (
            <>
              <button onClick={onClose} style={styles.backButton}>← Back</button>
              <h2 style={styles.title}>{currentDocument?.filename || 'Document'}</h2>
            </>
          )}
          <span style={styles.pageInfo}>
            {numPages > 0 ? `${numPages} pages` : 'Loading...'}
          </span>
        </div>
        <div style={styles.headerCenter}>
          <button
            onClick={() => setSettingsExpanded(!settingsExpanded)}
            style={styles.headerCenterButton}
            title={settingsExpanded ? "Hide settings" : "Show settings"}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.2)';
            }}
          >
            {settingsExpanded ? '▼' : '⚙️'} {settingsExpanded ? 'Hide' : 'Settings'}
          </button>
          <div style={styles.controls}>
            <button 
              onClick={() => setScale(prev => Math.max(0.5, prev - 0.2))} 
              style={styles.controlButton} 
              title="Zoom out"
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              −
            </button>
            <span style={styles.scaleText}>{Math.round(scale * 100)}%</span>
            <button 
              onClick={() => setScale(prev => Math.min(2, prev + 0.2))} 
              style={styles.controlButton} 
              title="Zoom in"
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              +
            </button>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={styles.chatToggle}
            title={sidebarOpen ? "Hide chat" : "Show chat"}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {sidebarOpen ? '👁️ Hide Chat' : '💬 Show Chat'}
          </button>
        </div>
        <div style={styles.headerRight}>
          {/* Empty for balance */}
        </div>
      </div>

      {/* Main content area */}
      <div style={styles.content}>
        {/* Navigation Sidebar */}
        <CourseNavigationSidebar
          currentCourseId={courseId}
          currentDocumentId={currentDocument.id}
          onCourseSelect={handleNavCourseSelect}
          onDocumentSelect={handleNavDocumentSelect}
          isCollapsed={navSidebarCollapsed}
          onToggleCollapse={() => setNavSidebarCollapsed(!navSidebarCollapsed)}
          width={navSidebarWidth}
          onWidthChange={setNavSidebarWidth}
        />

        {/* PDF Viewer */}
        <div 
          ref={pdfContainerRef}
          style={{ 
            ...styles.pdfContainer,
            width: sidebarOpen 
              ? `calc(100% - ${navSidebarCollapsed ? 40 : navSidebarWidth}px - ${sidebarWidth}px)` 
              : `calc(100% - ${navSidebarCollapsed ? 40 : navSidebarWidth}px)`,
            position: 'relative',
          }}
        >
          {/* Floating "Add to Chat" Button */}
          {showAddToChatButton && buttonPosition && selectedText && (
            <div
              style={{
                ...styles.addToChatButton,
                top: `${Math.max(10, buttonPosition.top)}px`,
                left: `${Math.max(10, Math.min(buttonPosition.left, (pdfContainerRef.current?.clientWidth || 800) - 120))}px`,
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addTextToChat(selectedText);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#0056b3';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#007bff';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <span style={styles.addToChatIcon}>+</span>
              Add to chat
            </div>
          )}
          <div style={styles.pdfWrapper}>
            {loading && !pdfBlobUrl ? (
              <div style={styles.loading}>
                <p>Loading PDF...</p>
                <p style={{ fontSize: '0.875rem', color: '#999', marginTop: '0.5rem' }}>Please wait</p>
              </div>
            ) : error && !pdfBlobUrl ? (
              <div style={styles.error}>
                <p><strong>Error loading PDF:</strong></p>
                <p>{error}</p>
                <button onClick={onClose} style={styles.closeButton}>Close</button>
              </div>
            ) : pdfBlobUrl ? (
              <>
                <Document
                  file={pdfBlobUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div style={styles.loading}>
                      <p>Loading PDF document...</p>
                      <p style={{ fontSize: '0.875rem', color: '#999', marginTop: '0.5rem' }}>This may take a moment</p>
                    </div>
                  }
                  error={
                    <div style={styles.error}>
                      <p><strong>Error rendering PDF:</strong></p>
                      <p>Please try again or contact support if the problem persists.</p>
                    </div>
                  }
                >
                {numPages > 0 ? (
                  Array.from(new Array(numPages), (el, index) => (
                    <div 
                      key={`page_${index + 1}`} 
                      data-page-number={index + 1} 
                      style={{
                        ...styles.pageWrapper,
                        // Keep pages visible during zoom by preventing re-render flicker
                        opacity: isZooming ? 0.95 : 1,
                        transition: isZooming ? 'none' : 'opacity 0.2s',
                      }}
                    >
                      <Page
                        pageNumber={index + 1}
                        scale={scale}
                        renderTextLayer={!isZooming}
                        renderAnnotationLayer={!isZooming}
                        loading={
                          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                            Loading page {index + 1}...
                          </div>
                        }
                        error={
                          <div style={styles.error}>
                            Failed to load page {index + 1}
                          </div>
                        }
                      />
                    </div>
                  ))
                ) : (
                    <div style={styles.loading}>
                      <p>Loading pages...</p>
                      <p style={{ fontSize: '0.875rem', color: '#999', marginTop: '0.5rem' }}>Detecting page count</p>
                    </div>
                  )}
                </Document>
                {error && <div style={styles.error}>{error}</div>}
              </>
            ) : (
              <div style={styles.loading}>
                <p>Preparing PDF...</p>
                <p style={{ fontSize: '0.875rem', color: '#999', marginTop: '0.5rem' }}>Initializing</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Sidebar */}
        {sidebarOpen && (
          <div ref={sidebarRef} style={{ ...styles.sidebar, width: `${sidebarWidth}px` }}>
            {/* Resize Handle */}
            <div
              style={{
                ...styles.resizeHandle,
                ...(isResizing ? styles.resizeHandleActive : {}),
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsResizing(true);
              }}
              onMouseEnter={() => {
                if (!isResizing && sidebarRef.current) {
                  sidebarRef.current.style.borderLeftColor = '#007bff';
                }
              }}
              onMouseLeave={() => {
                if (!isResizing && sidebarRef.current) {
                  sidebarRef.current.style.borderLeftColor = '#dee2e6';
                }
              }}
            />
            {/* Collapsible Settings Section */}
            {settingsExpanded && (
              <div style={styles.settingsContent}>
                <p style={styles.sidebarSubtitle}>Ask questions about this document</p>
                
                {/* Mode Toggle */}
                <div style={styles.modeToggle}>
                  <button
                    onClick={() => setResponseMode('strict')}
                    style={{
                      ...styles.modeButton,
                      ...(responseMode === 'strict' ? styles.modeButtonActive : {}),
                    }}
                    title="Answers strictly from course material only"
                  >
                    📚 Course Material Only
                  </button>
                  <button
                    onClick={() => setResponseMode('hybrid')}
                    style={{
                      ...styles.modeButton,
                      ...(responseMode === 'hybrid' ? styles.modeButtonActive : {}),
                    }}
                    title="Answers from course material plus additional general knowledge"
                  >
                    🌐 Hybrid (Course + General)
                  </button>
                </div>
                
                {/* Verbosity Selector */}
                <div style={styles.verbositySelector}>
                  <label style={styles.verbosityLabel}>Response Length:</label>
                  <div style={styles.verbosityButtons}>
                    <button
                      onClick={() => setVerbosity('concise')}
                      style={{
                        ...styles.verbosityButton,
                        ...(verbosity === 'concise' ? styles.verbosityButtonActive : {}),
                      }}
                      title="Brief, essential information only"
                    >
                      Concise
                    </button>
                    <button
                      onClick={() => setVerbosity('normal')}
                      style={{
                        ...styles.verbosityButton,
                        ...(verbosity === 'normal' ? styles.verbosityButtonActive : {}),
                      }}
                      title="Balanced response with adequate detail"
                    >
                      Normal
                    </button>
                    <button
                      onClick={() => setVerbosity('detailed')}
                      style={{
                        ...styles.verbosityButton,
                        ...(verbosity === 'detailed' ? styles.verbosityButtonActive : {}),
                      }}
                      title="Comprehensive and thorough explanation"
                    >
                      Detailed
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div style={styles.chatMessages}>
              {messages.length === 0 ? (
                <div style={styles.chatEmpty}>
                  <p>Start a conversation about this document!</p>
                  <p style={styles.chatHint}>
                    Ask questions about the content you're reading. You can highlight text and press Ctrl+L to add it to your question.
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  // Check if message is hybrid and parse sections
                  const hasCourseMaterialHeader = msg.content.includes('Based on Course Material:');
                  const hasAdditionalContextHeader = msg.content.includes('Additional Context:');
                  const isHybrid = msg.mode === 'hybrid' && (hasCourseMaterialHeader || hasAdditionalContextHeader);
                  let courseMaterialSection = '';
                  let additionalContextSection = '';
                  
                  if (isHybrid) {
                    if (hasAdditionalContextHeader) {
                      // Split by "Additional Context:" to separate the two sections
                      const parts = msg.content.split('Additional Context:');
                      const coursePart = parts[0];
                      courseMaterialSection = coursePart.replace('Based on Course Material:', '').trim();
                      additionalContextSection = parts[1]?.trim() || '';
                    } else if (hasCourseMaterialHeader) {
                      // Only course material section present
                      courseMaterialSection = msg.content.replace('Based on Course Material:', '').trim();
                    }
                  }
                  
                  return (
                    <div
                      key={idx}
                      style={{
                        ...styles.message,
                        ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage),
                      }}
                    >
                      {isHybrid && (courseMaterialSection || additionalContextSection) ? (
                        <div>
                          {courseMaterialSection && (
                            <div style={styles.courseMaterialSection}>
                              <strong style={styles.sectionHeader}>📚 Based on Course Material:</strong>
                              <MarkdownMessage content={courseMaterialSection} isUser={false} />
                            </div>
                          )}
                          {additionalContextSection && (
                            <div style={styles.additionalContextSection}>
                              <strong style={styles.sectionHeader}>🌐 Additional Context:</strong>
                              <MarkdownMessage content={additionalContextSection} isUser={false} />
                            </div>
                          )}
                        </div>
                      ) : (
                        <MarkdownMessage content={msg.content} isUser={msg.role === 'user'} />
                      )}
                      {msg.sources && msg.sources.length > 0 && (
                        <div style={{
                          ...styles.sources,
                          ...(msg.role === 'assistant' ? styles.sourcesAssistant : {}),
                        }}>
                          <strong style={msg.role === 'assistant' ? { color: '#374151' } : { color: 'white' }}>Sources:</strong>
                          <div>
                            {msg.sources.map((src, srcIdx) => (
                              <span
                                key={srcIdx}
                                onClick={() => handleSourceClick(src)}
                                style={{
                                  ...styles.sourceTag,
                                  ...(msg.role === 'assistant' ? styles.sourceTagAssistant : {}),
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                }}
                                title={`Click to view ${src.document_name || 'document'} on page ${src.page}`}
                              >
                                {src.document_name || 'Unknown Document'} - Page {src.page}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} style={styles.chatInput}>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask a question... (Ctrl+L to add selected text)"
                disabled={sending}
                style={styles.chatInputField}
              />
              <button
                type="submit"
                disabled={sending || !inputMessage.trim()}
                style={{
                  ...styles.sendButton,
                  ...(sending || !inputMessage.trim() ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                }}
              >
                {sending ? '...' : 'Send'}
              </button>
            </form>
            {selectedText && (
              <div style={styles.selectedTextHint}>
                Selected: "{selectedText.substring(0, 50)}{selectedText.length > 50 ? '...' : ''}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundAttachment: 'fixed',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
  },
  header: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    padding: '1rem 1.5rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flex: 1,
    minWidth: 0,
  },
  headerCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
    flex: 1,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flex: 1,
    minWidth: 0,
  },
  headerCenterButton: {
    padding: '0.5rem 0.75rem',
    background: 'rgba(102, 126, 234, 0.1)',
    color: '#667eea',
    border: '1px solid rgba(102, 126, 234, 0.2)',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    whiteSpace: 'nowrap',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    color: '#111827',
    flex: 1,
    fontWeight: '700',
  },
  pageInfo: {
    color: '#6b7280',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  zoomInfo: {
    color: '#667eea',
    fontSize: '0.875rem',
    fontWeight: '700',
    marginLeft: '0.5rem',
    padding: '0.375rem 0.75rem',
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
    borderRadius: '0.5rem',
    border: '1px solid rgba(102, 126, 234, 0.2)',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(102, 126, 234, 0.1)',
    padding: '0.25rem',
    borderRadius: '0.75rem',
  },
  controlButton: {
    padding: '0.5rem 0.875rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    minWidth: '40px',
  },
  disabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  scaleText: {
    minWidth: '50px',
    textAlign: 'center',
    fontSize: '0.875rem',
    color: '#333',
  },
  pageInput: {
    width: '60px',
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    textAlign: 'center',
    fontSize: '0.875rem',
  },
  chatToggle: {
    padding: '0.625rem 1.25rem',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
  },
  selectedTextHint: {
    padding: '0.5rem 1rem',
    background: '#e7f3ff',
    borderTop: '1px solid #dee2e6',
    fontSize: '0.75rem',
    color: '#007bff',
  },
  addToChatButton: {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1.25rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
    zIndex: 1000,
    transition: 'all 0.2s',
    userSelect: 'none',
  },
  addToChatIcon: {
    fontSize: '1.2rem',
    lineHeight: '1',
    fontWeight: 'bold',
  },
  backButton: {
    padding: '0.625rem 1.25rem',
    background: 'rgba(107, 114, 128, 0.1)',
    color: '#374151',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  closeButton: {
    padding: '0.75rem 1.5rem',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '1rem',
  },
  content: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  pdfContainer: {
    flex: 1,
    overflow: 'auto',
    background: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '2rem',
    minHeight: '400px',
    minWidth: '300px',
  },
  pageWrapper: {
    marginBottom: '1.5rem',
    background: 'white',
    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
    borderRadius: '0.5rem',
    overflow: 'hidden',
  },
  pdfWrapper: {
    width: '100%',
    minWidth: '300px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
  },
  sidebar: {
    position: 'relative',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderLeft: '1px solid rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '100%',
    flexShrink: 0,
    boxShadow: '-4px 0 6px -1px rgba(0, 0, 0, 0.1)',
  },
  resizeHandle: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '4px',
    backgroundColor: 'transparent',
    cursor: 'ew-resize',
    zIndex: 10,
    transition: 'background-color 0.2s',
  },
  resizeHandleActive: {
    backgroundColor: '#667eea',
    width: '4px',
  },
  settingsContent: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #e5e7eb',
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
  },
  sidebarSubtitle: {
    margin: 0,
    color: '#6b7280',
    fontSize: '0.875rem',
  },
  modeToggle: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1rem',
    flexDirection: 'column',
  },
  modeButton: {
    padding: '0.625rem 1rem',
    background: 'rgba(102, 126, 234, 0.1)',
    color: '#667eea',
    border: '2px solid rgba(102, 126, 234, 0.3)',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    textAlign: 'left',
    width: '100%',
  },
  modeButtonActive: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: '2px solid #667eea',
    boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
  },
  verbositySelector: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb',
  },
  verbosityLabel: {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  verbosityButtons: {
    display: 'flex',
    gap: '0.375rem',
    flexWrap: 'wrap',
  },
  verbosityButton: {
    flex: 1,
    minWidth: '70px',
    padding: '0.5rem 0.75rem',
    background: 'rgba(107, 114, 128, 0.1)',
    color: '#6b7280',
    border: '1px solid rgba(107, 114, 128, 0.2)',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '500',
    transition: 'all 0.2s',
    textAlign: 'center',
  },
  verbosityButtonActive: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: '1px solid #10b981',
    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
  },
  courseMaterialSection: {
    marginBottom: '0.75rem',
    padding: '0.5rem 0.75rem',
    background: 'rgba(102, 126, 234, 0.05)',
    borderRadius: '0.5rem',
    border: '1px solid rgba(102, 126, 234, 0.15)',
  },
  additionalContextSection: {
    marginTop: '0.75rem',
    padding: '0.5rem 0.75rem',
    background: 'rgba(16, 185, 129, 0.05)',
    borderRadius: '0.5rem',
    border: '1px solid rgba(16, 185, 129, 0.15)',
  },
  sectionHeader: {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
    background: '#ffffff',
    minHeight: 0,
  },
  chatEmpty: {
    textAlign: 'center',
    padding: '3rem 2rem',
    color: '#6b7280',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatHint: {
    fontSize: '0.875rem',
    color: '#9ca3af',
    marginTop: '0.5rem',
  },
  message: {
    padding: '0.375rem 0.625rem',
    borderRadius: '0.5rem',
    maxWidth: '95%',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    lineHeight: '1.6',
    marginBottom: '0.375rem',
  },
  userMessage: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    alignSelf: 'flex-end',
    marginLeft: 'auto',
    marginRight: '0',
    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
  },
  assistantMessage: {
    background: '#ffffff',
    color: '#111827',
    alignSelf: 'flex-start',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  messageContent: {
    marginBottom: '0',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontSize: '0.9375rem',
    lineHeight: '1.75',
  },
  sources: {
    marginTop: '0.375rem',
    paddingTop: '0.375rem',
    fontSize: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    borderTop: '1px solid rgba(255,255,255,0.3)',
  },
  sourcesAssistant: {
    borderTop: '1px solid #e5e7eb',
  },
  sourceTag: {
    display: 'inline-block',
    padding: '0.2rem 0.4rem',
    borderRadius: '4px',
    marginRight: '0.375rem',
    marginTop: '0.2rem',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    fontSize: '0.75rem',
  },
  sourceTagAssistant: {
    background: 'rgba(102, 126, 234, 0.1)',
    color: '#667eea',
    border: '1px solid rgba(102, 126, 234, 0.2)',
  },
  chatInput: {
    display: 'flex',
    padding: '0.75rem',
    borderTop: '1px solid #e5e7eb',
    gap: '0.5rem',
    background: 'white',
    flexShrink: 0,
  },
  chatInputField: {
    flex: 1,
    padding: '0.625rem 0.875rem',
    border: '2px solid #e5e7eb',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    transition: 'all 0.2s',
    background: '#f9fafb',
  },
  sendButton: {
    padding: '0.625rem 1.25rem',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
    whiteSpace: 'nowrap',
  },
  loading: {
    textAlign: 'center',
    padding: '3rem 2rem',
    color: '#6b7280',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '1rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    minWidth: '300px',
    margin: '2rem',
  },
  error: {
    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
    color: '#dc2626',
    padding: '1.25rem',
    borderRadius: '0.75rem',
    margin: '1rem',
    border: '1px solid #fca5a5',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
};

