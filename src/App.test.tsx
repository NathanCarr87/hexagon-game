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
    expect(screen.getAllByText('Ironwatch-01').length).toBeGreaterThan(0)
    expect(screen.getByText(/unit stat costs/i)).toBeInTheDocument()
    expect(screen.getByText(/temporary scenario data/i)).toBeInTheDocument()
  })

  it('restores the initial selection when the scenario is reset', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Select other unit' }))
    expect(screen.getAllByText('Ashfall-01').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Reset scenario' }))

    expect(screen.getAllByText('Ironwatch-01').length).toBeGreaterThan(0)
    expect(
      screen.getByRole('region', { name: 'Selected unit' }),
    ).toHaveTextContent('q-2 / r0')
  })

  it('shows selected empty hex data', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Select empty hex' }))

    expect(screen.getByText('Unoccupied hex')).toBeInTheDocument()
    expect(screen.getAllByText('mountains')).toHaveLength(2)
  })

  it('starts a battle, advances player turns, and restarts the battle', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start battle' }))

    const battle = screen.getByRole('region', { name: 'Battle' })
    expect(battle).toHaveTextContent('ACTIVE')
    expect(battle).toHaveTextContent(/Round 1/)
    expect(battle).toHaveTextContent(/starts round 1/)

    fireEvent.click(screen.getByRole('button', { name: /^End .* turn$/ }))
    expect(battle).toHaveTextContent(/begins their turn in round 1/)

    fireEvent.click(screen.getByRole('button', { name: 'Restart battle' }))
    expect(battle).toHaveTextContent('ACTIVE')
    expect(battle).toHaveTextContent(/Round 1/)
    expect(battle).toHaveTextContent(/starts round 1/)
  })
})
