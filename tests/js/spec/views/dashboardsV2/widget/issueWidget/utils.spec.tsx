import {generateIssueWidgetFieldOptions} from 'sentry/views/dashboardsV2/widget/issueWidget/utils';

describe('generateIssueWidgetFieldOptions', function () {
  it('returns default issue fields', () => {
    const issueFields = generateIssueWidgetFieldOptions();
    expect(Object.keys(issueFields)).toEqual([
      'field:assignee',
      'field:count',
      'field:firstSeen',
      'field:isBookmarked',
      'field:isHandled',
      'field:isSubscribed',
      'field:issue',
      'field:lastSeen',
      'field:level',
      'field:lifetimeCount',
      'field:lifetimeUserCount',
      'field:platform',
      'field:status',
      'field:title',
      'field:userCount',
    ]);
  });
  it('returns supplied issue fields', () => {
    const issueFields = generateIssueWidgetFieldOptions({
      assignee: 'string',
      title: 'string',
    });
    expect(Object.keys(issueFields)).toEqual(['field:assignee', 'field:title']);
  });
});
