import { describe, expect, it } from 'vitest';
import { AppError, messageForError } from '../../src/renderer/errors';

describe('application error copy', () => {
  it('maps typed failures to an actionable English message', () => {
    expect(messageForError(new AppError('OUT_OF_MEMORY'), 'fallback')).toContain('lowering Particle Density');
    expect(messageForError(new AppError('UNSUPPORTED_IMAGE'), 'fallback')).toContain('valid JPG or PNG');
  });
});
