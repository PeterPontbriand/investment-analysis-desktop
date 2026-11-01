import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import App from '../../src/App.vue';

describe('static screen', () => {
  it('shows the product heading and pre-release notice', () => {
    const wrapper = mount(App);

    expect(wrapper.get('h1').text()).toBe('Investment Analysis Desktop');
    expect(wrapper.get('p').text()).toBe(
      'Pre-release: this application is under development and does not yet show any analysis.',
    );
  });
});
