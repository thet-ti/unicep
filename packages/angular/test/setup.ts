import '@angular/compiler';
import { provideZonelessChangeDetection } from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterEach, beforeEach } from 'vitest';

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

// Vitest globals are off, so Angular does not register its own teardown.
afterEach(() => getTestBed().resetTestingModule());

beforeEach(() => {
  getTestBed().configureTestingModule({ providers: [provideZonelessChangeDetection()] });
});
