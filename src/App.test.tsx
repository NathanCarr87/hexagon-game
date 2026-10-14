import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./game/scene/Battlefield', () => ({
  Battlefield: ({
    onSelectHex,
    onSelectUnit,
  }: {
    onSelectHex: (hexId: string) => void
    onSelectUnit: (unitId: string) => void
  }) => (
    <div data-testid="battlefield">
      <button onClick={() => onSelectUnit('unit-ashfall-01')} type="button">
        Select other unit
      </button>
      <button onClick={() => onSelectHex('hex:0,3')} type="button">
        Select empty hex
      </button>
    </div>
  ),
}))

describe('App', () => {
  afterEach(cleanup)

  beforeEach(() => {
    localStorage.clear()
  })

  it('shows the scenario, selected unit, and temporary-data notice', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /the narrows/i }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('battlefield')).toBeInTheDocument()
    expect(screen.getByText('Ironwatch-01')).toBeInTheDocument()
    expect(screen.getByText(/temporary scenario data/i)).toBeInTheDocument()
  })

  it('restores the initial selection when the scenario is reset', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Select other unit' }))
    expect(screen.getByText('Ashfall-01')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reset scenario' }))

    expect(screen.getByText('Ironwatch-01')).toBeInTheDocument()
    expect(screen.getAllByText('blueward')).toHaveLength(2)
  })

  it('shows selected empty hex data', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Select empty hex' }))

    expect(screen.getByText('Unoccupied hex')).toBeInTheDocument()
    expect(screen.getAllByText('mountains')).toHaveLength(2)
  })
})
