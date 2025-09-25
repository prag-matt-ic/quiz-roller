'use client'

import { useChat } from '@ai-sdk/react'
import { useState } from 'react'

import { GenerateQuestionUITool } from '@/model/tools'

export default function Main() {
  const [input, setInput] = useState('')
  const { messages, sendMessage } = useChat()
  const [difficulty, setDifficulty] = useState(1)

  const onAnswerConfirmed = (text: string) => {
    const nextDifficulty = Math.min(difficulty + 1, 10)
    setDifficulty(nextDifficulty)
    sendMessage({ text }, { body: { currentDifficulty: nextDifficulty } })
  }

  return (
    <div className="stretch mx-auto flex w-full max-w-md flex-col py-24">
      {messages.map((message) => (
        <div key={message.id} className="whitespace-pre-wrap">
          {message.role === 'user' ? 'User: ' : 'AI: '}
          {message.parts.map((part, i) => {
            switch (part.type) {
              case 'text':
                return <div key={`${message.id}-${i}`}>{part.text}</div>

              case 'tool-generateQuestion': {
                if (part.state === 'input-available' || part.state === 'input-streaming') {
                  const input = part.input as GenerateQuestionUITool['input']
                  return (
                    <div key={`${message.id}-${i}`}>
                      Generating question about: {input?.topic}
                    </div>
                  )
                }

                if (part.state === 'output-available') {
                  const output = part.output as GenerateQuestionUITool['output']
                  return (
                    <div key={`${message.id}-${i}`}>
                      <div className="mb-4">
                        <strong>Question:</strong> {output.text}
                      </div>
                      <div className="flex flex-col gap-2">
                        {output.answers.map((answer, answerIndex) => (
                          <button
                            key={`answer-${answerIndex}`}
                            onClick={() => onAnswerConfirmed(answer.text)}
                            className="rounded border border-zinc-300 p-2 text-left transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800">
                            {answer.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                }

                return <div key={`${message.id}-${i}`}>{JSON.stringify(part)}</div>
              }
            }
          })}
        </div>
      ))}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          sendMessage({ text: input })
          setInput('')
        }}>
        <input
          className="fixed bottom-0 mb-8 w-full max-w-md rounded border border-zinc-300 p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
          value={input}
          placeholder="Say something..."
          onChange={(e) => setInput(e.currentTarget.value)}
        />
      </form>
    </div>
  )
}
