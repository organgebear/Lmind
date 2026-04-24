import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Document, MindMapNode } from "@/types";
import { genId } from "@/lib/id";

function createDefaultRoot(): MindMapNode {
  return {
    id: "root",
    label: "中心主题",
    children: [],
  };
}

interface DocumentState {
  documents: Document[];
  currentDocId: string | null;

  createDocument: (title: string, userId?: string) => Document;
  importDocument: (title: string, rootNode: MindMapNode, userId?: string) => Document;
  deleteDocument: (id: string) => void;
  renameDocument: (id: string, title: string) => void;
  setCurrentDoc: (id: string | null) => void;
  updateRootNode: (docId: string, rootNode: MindMapNode) => void;
  getCurrentDocument: () => Document | undefined;
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      documents: [],
      currentDocId: null,

      createDocument: (title: string, userId?: string) => {
        const doc: Document = {
          id: genId(),
          title,
          rootNode: createDefaultRoot(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId,
        };
        set((state) => ({ documents: [...state.documents, doc] }));
        return doc;
      },

      importDocument: (title: string, rootNode: MindMapNode, userId?: string) => {
        const doc: Document = {
          id: genId(),
          title,
          rootNode: { ...rootNode, id: "root" },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId,
        };
        set((state) => ({ documents: [...state.documents, doc] }));
        return doc;
      },

      deleteDocument: (id: string) => {
        set((state) => ({
          documents: state.documents.filter((d) => d.id !== id),
          currentDocId: state.currentDocId === id ? null : state.currentDocId,
        }));
      },

      renameDocument: (id: string, title: string) => {
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === id ? { ...d, title, updatedAt: new Date().toISOString() } : d
          ),
        }));
      },

      setCurrentDoc: (id: string | null) => set({ currentDocId: id }),

      updateRootNode: (docId: string, rootNode: MindMapNode) => {
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === docId
              ? { ...d, rootNode, updatedAt: new Date().toISOString() }
              : d
          ),
        }));
      },

      getCurrentDocument: () => {
        const { documents, currentDocId } = get();
        return documents.find((d) => d.id === currentDocId);
      },
    }),
    { name: "lmind-documents" }
  )
);
