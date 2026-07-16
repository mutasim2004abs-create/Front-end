import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { loadState, store } from '@/lib/store';
import { calculateTargets } from '@/lib/macros';

const profile = {
  sex: 'male' as const,
  age: 30,
  heightCm: 180,
  weightKg: 80,
  activity: 'moderate' as const,
  goal: 'maintain' as const,
};

function renderProfile(): void {
  render(
    <MemoryRouter>
      <ProfileScreen />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  store.reset();
  store.setProfile(profile);
});

describe('ProfileScreen — targets', () => {
  it('shows the current computed targets', () => {
    renderProfile();
    const targets = calculateTargets(profile);
    expect(screen.getByText(String(targets.kcal))).toBeInTheDocument();
  });

  it('explains every step of the calculation, citing Mifflin-St Jeor', () => {
    renderProfile();
    expect(screen.getByText(/mifflin-st jeor/i)).toBeInTheDocument();
    expect(screen.getByText(/not medical advice/i)).toBeInTheDocument();
  });

  it('recalculates the preview live when the goal changes, before saving', async () => {
    const user = userEvent.setup();
    renderProfile();

    const before = calculateTargets(profile).kcal;
    await user.click(screen.getByRole('radio', { name: /^cut/i }));

    const after = calculateTargets({ ...profile, goal: 'cut' }).kcal;
    expect(await screen.findByText(String(after))).toBeInTheDocument();
    expect(after).toBeLessThan(before);
    // Not saved until the user presses save.
    expect(store.getState().profile?.goal).toBe('maintain');
  });

  it('persists changes on save', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole('radio', { name: /^cut/i }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(store.getState().profile?.goal).toBe('cut');
    expect(loadState().profile?.goal).toBe('cut'); // survives a reload
    expect(store.getState().targets).toEqual(calculateTargets({ ...profile, goal: 'cut' }));
  });

  it('warns when a value is outside the supported range', async () => {
    const user = userEvent.setup();
    renderProfile();

    const age = screen.getByLabelText(/age/i);
    await user.clear(age);
    await user.type(age, '150');

    expect(await screen.findByRole('alert')).toHaveTextContent(/outside the supported range/i);
  });
});

describe('ProfileScreen — data ownership', () => {
  it('states plainly that there are no accounts and data is local', () => {
    renderProfile();
    expect(screen.getByText(/no accounts and no server for your data/i)).toBeInTheDocument();
    expect(screen.getByText(/never uploaded/i)).toBeInTheDocument();
  });

  it('exports the log as a JSON download', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn().mockReturnValue('blob:fake');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderProfile();
    await user.click(screen.getByRole('button', { name: /export my data/i }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });

  it('asks for confirmation before deleting everything', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole('button', { name: /reset all data/i }));

    expect(screen.getByText(/this cannot be undone/i)).toBeInTheDocument();
    expect(store.getState().profile).not.toBeNull(); // nothing deleted yet
  });

  it('can back out of the reset confirmation', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole('button', { name: /reset all data/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(store.getState().profile).toEqual(profile);
  });

  it('clears memory and storage when confirmed', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole('button', { name: /reset all data/i }));
    await user.click(screen.getByRole('button', { name: /delete everything/i }));

    expect(store.getState().profile).toBeNull();
    expect(loadState().profile).toBeNull();
  });
});

describe('ProfileScreen — preferences', () => {
  it('persists the reduce-motion preference', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole('checkbox', { name: /reduce motion/i }));

    expect(store.getState().settings.reducedMotion).toBe(true);
    expect(loadState().settings.reducedMotion).toBe(true);
  });
});
