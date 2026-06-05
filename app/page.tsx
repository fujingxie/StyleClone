import { StyleCloneWorkbench, type ModalKey, type WorkspaceState } from "@/components/styleclone-workbench";

type PageProps = {
  searchParams?: {
    state?: string;
    modal?: string;
  };
};

const states: WorkspaceState[] = ["empty", "training", "ready", "chat", "auto", "error"];
const modals: ModalKey[] = ["newCharacter", "styleSettings", "upload", "deleteConfirm"];

function parseState(value: string | undefined): WorkspaceState {
  if (value && states.includes(value as WorkspaceState)) {
    return value as WorkspaceState;
  }

  return "ready";
}

function parseModal(value: string | undefined): ModalKey | null {
  if (value && modals.includes(value as ModalKey)) {
    return value as ModalKey;
  }

  return null;
}

export default function Page({ searchParams }: PageProps) {
  return (
    <StyleCloneWorkbench
      initialModal={parseModal(searchParams?.modal)}
      initialState={parseState(searchParams?.state)}
    />
  );
}
