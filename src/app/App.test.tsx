import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '@/app/App';
import { store } from '@/lib/store';

const profile = {
  sex: 'male' as const,
  age: 30,
  heightCm: 180,
  weightKg: 80,
  activity: 'moderate' as const,
  goal: 'maintain' as const,
};

function renderAt(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  store.reset();
});

describe('routing — the onboarding gate', () => {
  it('sends a new user to onboarding instead of an empty dashboard', async () => {
    renderAt('/');
    expect(await screen.findByText(/let’s set your targets/i)).toBeInTheDocument();
  });

  it('guards every screen until a profile exists', async () => {
    for (const path of ['/log', '/scan', '/plan', '/history', '/profile']) {
      renderAt(path);
      expect(await screen.findByText(/let’s set your targets/i), path).toBeInTheDocument();
      document.body.innerHTML = '';
    }
  });

  it('does not show the main nav during onboarding', () => {
    renderAt('/');
    expect(screen.queryByRole('navigation', { name: /main/i })).not.toBeInTheDocument();
  });
});

describe('routing — once onboarded', () => {
  beforeEach(() => {
    store.setProfile(profile);
  });

  it('shows the dashboard at the root', async () => {
    renderAt('/');
    expect(await screen.findByText(/today’s meals/i)).toBeInTheDocument();
  });

  it('redirects away from onboarding once a profile exists', async () => {
    renderAt('/onboarding');
    expect(await screen.findByText(/today’s meals/i)).toBeInTheDocument();
  });

  it('redirects an unknown route to the dashboard', async () => {
    renderAt('/this-route-does-not-exist');
    expect(await screen.findByText(/today’s meals/i)).toBeInTheDocument();
  });

  it('renders the main nav with every screen', () => {
    renderAt('/');
    const nav = screen.getByRole('navigation', { name: /main/i });
    for (const label of ['Today', 'Log', 'Scan', 'Plan', 'History', 'Profile']) {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('navigates to the log screen from the nav', async () => {
    const user = userEvent.setup();
    renderAt('/');

    await user.click(screen.getByRole('link', { name: 'Log' }));
    expect(await screen.findByLabelText(/search foods/i)).toBeInTheDocument();
  });

  it('lazily loads the plan screen without crashing', async () => {
    const user = userEvent.setup();
    renderAt('/');

    await user.click(screen.getByRole('link', { name: 'Plan' }));
    expect(await screen.findByText(/a day built from the food database/i)).toBeInTheDocument();
  });

  it('offers a skip link to the main content', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: /skip to content/i })).toHaveAttribute('href', '#main');
  });
});

describe('dashboard — empty vs populated', () => {
  beforeEach(() => {
    store.setProfile(profile);
  });

  it('shows an honest empty state with no data logged', async () => {
    renderAt('/');
    expect(await screen.findByText(/nothing logged yet/i)).toBeInTheDocument();
  });

  it('shows the full calorie target as remaining before anything is logged', async () => {
    renderAt('/');
    const targets = store.getState().targets;

    // The number and the unit are separate elements, so match on the heading's text.
    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(`${targets?.kcal ?? 0} kcal left`);
  });

  it('reflects a logged entry in the totals and meal list', async () => {
    store.addEntry({
      name: 'Chicken breast, cooked',
      grams: 150,
      kcal: 248,
      protein: 46.5,
      carbs: 0,
      fat: 5.4,
      meal: 'lunch',
      source: 'food-db',
    });

    renderAt('/');

    const targets = store.getState().targets;
    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(`${(targets?.kcal ?? 0) - 248} kcal left`);

    // "248 of N kcal logged" appears as the subtitle and in the ring's screen-reader text.
    expect(screen.getAllByText(/248 of/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/chicken breast/i)).toBeInTheDocument();
    expect(screen.queryByText(/nothing logged yet/i)).not.toBeInTheDocument();
  });
});
