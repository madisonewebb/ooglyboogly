import { describe, expect, it } from 'vitest';
import { indexPetArt, parsePetArtPath, PET_ART, petArt } from './artIndex';

describe('parsePetArtPath', () => {
  it('reads the pet and the pose from the file path', () => {
    expect(parsePetArtPath('/src/art/pets/toad/happy.webp')).toEqual({
      pet: 'toad',
      pose: 'happy',
    });
    expect(parsePetArtPath('../../art/pets/ghostCheerleader/cheer.webp')).toEqual({
      pet: 'ghostCheerleader',
      pose: 'cheer',
    });
  });

  it('rejects unknown pets, unknown poses and other files', () => {
    expect(parsePetArtPath('/art/pets/dragon/idle.webp')).toBeNull();
    expect(parsePetArtPath('/art/pets/toad/dance.webp')).toBeNull();
    expect(parsePetArtPath('/art/pets/toad/idle.png')).toBeNull();
    expect(parsePetArtPath('/art/stickers/idle.webp')).toBeNull();
  });
});

describe('indexPetArt and petArt', () => {
  const art = indexPetArt({
    '/art/pets/toad/idle.webp': '/a/idle.js',
    '/art/pets/toad/happy.webp': '/a/happy.js',
    '/art/pets/bat/sad.webp': '/a/bat-sad.js',
    '/art/pets/nope/idle.webp': '/a/x.js',
  });

  it('groups files by pet and pose, per pose', () => {
    expect(petArt('toad', 'happy', art)).toBe('/a/happy.js');
    expect(petArt('bat', 'sad', art)).toBe('/a/bat-sad.js');
    expect(petArt('toad', 'sad', art)).toBeUndefined();
    expect(petArt('blackCat', 'idle', art)).toBeUndefined();
  });

  it('is empty until real art is saved (a missing file is fine)', () => {
    expect(indexPetArt({})).toEqual({});
    expect(Object.keys(PET_ART).length).toBeGreaterThanOrEqual(0);
  });
});
