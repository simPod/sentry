# Generated by Django 2.2.24 on 2021-09-23 14:02
from django.db import migrations

from sentry.utils.query import RangeQuerySetWrapperWithProgressBar


def rename_issue_widget_query_fields(apps, schema_editor):

    DashboardWidgetQuery = apps.get_model("sentry", "DashboardWidgetQuery")

    old_to_new_field_mapping = {
        "count": "events",
        "userCount": "users",
        "lifetimeCount": "lifetimeEvents",
        "lifetimeUserCount": "lifetimeUsers",
    }

    for query in RangeQuerySetWrapperWithProgressBar(DashboardWidgetQuery.objects.all()):
        fields = getattr(query, "fields")
        new_fields = map(
            lambda field: field
            if field not in old_to_new_field_mapping.keys()
            else old_to_new_field_mapping[field],
            fields,
        )
        if fields != new_fields:
            query.fields = new_fields
            query.save()


class Migration(migrations.Migration):
    # This flag is used to mark that a migration shouldn't be automatically run in
    # production. We set this to True for operations that we think are risky and want
    # someone from ops to run manually and monitor.
    # General advice is that if in doubt, mark your migration as `is_dangerous`.
    # Some things you should always mark as dangerous:
    # - Large data migrations. Typically we want these to be run manually by ops so that
    #   they can be monitored. Since data migrations will now hold a transaction open
    #   this is even more important.
    # - Adding columns to highly active tables, even ones that are NULL.
    is_dangerous = False

    # This flag is used to decide whether to run this migration in a transaction or not.
    # By default we prefer to run in a transaction, but for migrations where you want
    # to `CREATE INDEX CONCURRENTLY` this needs to be set to False. Typically you'll
    # want to create an index concurrently when adding one to an existing table.
    # You'll also usually want to set this to `False` if you're writing a data
    # migration, since we don't want the entire migration to run in one long-running
    # transaction.
    atomic = False

    dependencies = [
        ("sentry", "0266_add_dashboard_widget_detail_field"),
    ]

    operations = [
        migrations.RunPython(
            rename_issue_widget_query_fields,
            migrations.RunPython.noop,
            hints={"tables": ["sentry_dashboardwidgetquery"]},
        ),
    ]
