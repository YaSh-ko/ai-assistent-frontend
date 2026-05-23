import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ComponentProps, ReactNode } from "react";
import { InboxItemInput } from "./inbox-item-input";
import { HumanResponseWithEdits } from "../types";

const toastErrorMock = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

vi.mock("../../markdown-text", () => ({
  MarkdownText: ({ children }: { children: ReactNode }) => (
    <span>{children}</span>
  ),
}));

function makeInterrupt(overrides: Partial<any> = {}) {
  return {
    action_request: {
      action: "send_email",
      args: {
        subject: "Hello",
        count: 2,
      },
    },
    config: {
      allow_edit: true,
      allow_respond: true,
      allow_accept: true,
      allow_ignore: false,
    },
    ...overrides,
  };
}

function renderComponent(overrides: Partial<ComponentProps<typeof InboxItemInput>> = {}) {
  const setHumanResponse = vi.fn();
  const setSelectedSubmitType = vi.fn();
  const setHasEdited = vi.fn();
  const setHasAddedResponse = vi.fn();
  const handleSubmit = vi.fn().mockResolvedValue(undefined);

  const props: ComponentProps<typeof InboxItemInput> = {
    interruptValue: makeInterrupt(),
    humanResponse: [
      {
        type: "edit",
        args: {
          action: "send_email",
          args: {
            subject: "Hello",
            count: 2,
          },
        },
        acceptAllowed: true,
        editsMade: false,
      },
      {
        type: "response",
        args: "Initial reply",
      },
      {
        type: "accept",
        args: null,
      },
    ] as HumanResponseWithEdits[],
    supportsMultipleMethods: true,
    acceptAllowed: true,
    hasEdited: false,
    hasAddedResponse: true,
    initialValues: {
      subject: "Hello",
      count: "2",
    },
    streaming: false,
    streamFinished: false,
    setHumanResponse,
    setSelectedSubmitType,
    setHasAddedResponse,
    setHasEdited,
    handleSubmit,
    ...overrides,
  };

  const view = render(<InboxItemInput {...props} />);
  return {
    ...view,
    props,
    setHumanResponse,
    setSelectedSubmitType,
    setHasEdited,
    setHasAddedResponse,
    handleSubmit,
  };
}

describe("InboxItemInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates response text and submits with ctrl+enter", () => {
    const { setHumanResponse, setSelectedSubmitType, setHasAddedResponse, handleSubmit } =
      renderComponent();

    const textarea = screen.getByDisplayValue("Initial reply");
    fireEvent.change(textarea, { target: { value: "Updated response" } });
    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true, preventDefault: vi.fn() });

    expect(setSelectedSubmitType).toHaveBeenCalledWith("response");
    expect(setHasAddedResponse).toHaveBeenCalledWith(true);
    expect(handleSubmit).toHaveBeenCalled();

    const updater = setHumanResponse.mock.calls[0][0];
    expect(
      updater([
        { type: "response", args: "Initial reply" },
        { type: "edit", args: { action: "send_email", args: { subject: "Hello", count: 2 } } },
      ]),
    ).toEqual([
      { type: "response", args: "Updated response" },
      { type: "edit", args: { action: "send_email", args: { subject: "Hello", count: 2 } } },
    ]);
  });

  it("resets editable fields back to initial values and switches to accept", () => {
    const { setHumanResponse, setSelectedSubmitType, setHasEdited } = renderComponent();

    const subjectField = screen.getByDisplayValue("Hello");
    fireEvent.change(subjectField, { target: { value: "Changed subject" } });

    const resetButtons = screen.getAllByText("Reset");
    fireEvent.click(resetButtons[0]);

    expect(setSelectedSubmitType).toHaveBeenCalledWith("accept");
    expect(setHasEdited).toHaveBeenCalledWith(false);

    const resetUpdater = setHumanResponse.mock.calls.at(-1)?.[0];
    expect(
      resetUpdater([
        {
          type: "edit",
          args: { action: "send_email", args: { subject: "Changed subject", count: "999" } },
          acceptAllowed: true,
          editsMade: true,
        },
      ]),
    ).toEqual([
      {
        type: "edit",
        args: { action: "send_email", args: { subject: "Hello", count: "2" } },
        acceptAllowed: true,
        editsMade: false,
      },
    ]);
  });

  it("shows accept card when only accept response is available", () => {
    renderComponent({
      humanResponse: [{ type: "accept", args: null }] as HumanResponseWithEdits[],
      supportsMultipleMethods: false,
      interruptValue: makeInterrupt({
        config: {
          allow_edit: true,
          allow_respond: false,
          allow_accept: true,
          allow_ignore: false,
        },
      }),
    });

    expect(screen.getByText("Accept")).toBeInTheDocument();
    expect(screen.getByText("Subject:")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("renders streaming and completion states", () => {
    const { rerender, props } = renderComponent({
      streaming: true,
      streamFinished: false,
    });

    expect(screen.getByText("Running...")).toBeInTheDocument();

    rerender(
      <InboxItemInput
        {...props}
        streaming={false}
        streamFinished={true}
      />,
    );

    expect(
      screen.getByText("Successfully finished Graph invocation."),
    ).toBeInTheDocument();
  });

  it("renders args outside action cards when only plain context should be shown", () => {
    renderComponent({
      humanResponse: [] as HumanResponseWithEdits[],
      supportsMultipleMethods: false,
      acceptAllowed: false,
      hasAddedResponse: false,
      interruptValue: makeInterrupt({
        config: {
          allow_edit: false,
          allow_respond: false,
          allow_accept: false,
          allow_ignore: false,
        },
      }),
    });

    expect(screen.getByText("Subject:")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.queryByText("Response")).not.toBeInTheDocument();
  });
});
